/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: LLM Medical Necessity Generation | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, supabase, supabaseAdmin } from "@greenlight/db";
import {
  generateMedicalNecessity,
  type MedicalNecessityInput,
} from "@greenlight/llm";
import type { Database } from "@greenlight/db";

type Tables = Database["public"]["Tables"];
type PaRequestRow = Tables["pa_request"]["Row"];
type OrderRow = Tables["order"]["Row"];
type PatientRow = Tables["patient"]["Row"];
type PayerRow = Tables["payer"]["Row"];
type PolicySnippetRow = Tables["policy_snippet"]["Row"];
type PaSummaryInsert = Tables["pa_summary"]["Insert"];
type PaSummaryRow = Tables["pa_summary"]["Row"];

/**
 * POST /api/llm/medical-necessity
 * Generate medical necessity summary for a PA request using LLM
 *
 * Body:
 * {
 *   pa_request_id: string
 * }
 *
 * This endpoint:
 * 1. Fetches PA request with order, patient, and payer details
 * 2. Fetches relevant policy criteria
 * 3. Generates medical necessity using Claude
 * 4. Inserts summary into database (versioned)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pa_request_id } = body;

    if (!pa_request_id) {
      return NextResponse.json(
        { success: false, error: "Missing pa_request_id" },
        { status: 400 }
      );
    }

    // Check if LLM is enabled
    const llmEnabled = process.env.ENABLE_LLM === "true";
    if (!llmEnabled) {
      return NextResponse.json(
        {
          success: false,
          error:
            "LLM features disabled. Set ENABLE_LLM=true and configure ANTHROPIC_API_KEY.",
        },
        { status: 503 }
      );
    }

    const { data: paRequest, error: paError } = await supabase
      .from("pa_request")
      .select("*")
      .eq("id", pa_request_id)
      .single();

    if (paError || !paRequest) {
      return NextResponse.json(
        { success: false, error: "PA request not found or access denied" },
        { status: 404 }
      );
    }

    const paRequestRow = paRequest as PaRequestRow;

    if (!paRequestRow.payer_id) {
      return NextResponse.json(
        { success: false, error: "PA request missing payer information" },
        { status: 400 }
      );
    }

    const [orderResult, payerResult] = await Promise.all([
      supabase
        .from("order")
        .select("*")
        .eq("id", paRequestRow.order_id)
        .single(),
      supabase
        .from("payer")
        .select("*")
        .eq("id", paRequestRow.payer_id)
        .single(),
    ]);

    const order = orderResult.data as OrderRow | null;
    if (orderResult.error || !order) {
      return NextResponse.json(
        { success: false, error: "Related order not found" },
        { status: 404 }
      );
    }

    const patientResult = await supabase
      .from("patient")
      .select("*")
      .eq("id", order.patient_id)
      .single();

    const patient = patientResult.data as PatientRow | null;
    if (patientResult.error || !patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const payer = payerResult.data as PayerRow | null;
    if (payerResult.error || !payer) {
      return NextResponse.json(
        { success: false, error: "Payer not found" },
        { status: 404 }
      );
    }

    // Fetch relevant policy snippets for criteria
    let snippetsQuery = supabase
      .from("policy_snippet")
      .select("snippet_text")
      .eq("payer_id", payer.id);

    if (order.modality) {
      snippetsQuery = snippetsQuery.ilike("modality", `%${order.modality}%`);
    }

    const { data: policySnippets } = await snippetsQuery.limit(5);

    // Calculate patient age if DOB available
    let age: number | undefined;
    if (patient.dob) {
      const birthDate = new Date(patient.dob);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    // Prepare input for LLM
      const input: MedicalNecessityInput = {
        patient_demographics: {
          age,
          sex: patient.sex ?? undefined,
        },
      modality: order.modality,
      cpt_codes: order.cpt_codes ?? [],
      icd10_codes: order.icd10_codes ?? [],
      clinic_notes: order.clinic_notes_text ?? "No clinical notes provided.",
      policy_criteria:
        policySnippets?.map(
          (p) => (p as Pick<PolicySnippetRow, "snippet_text">).snippet_text
        ) ?? [],
    };

    // Generate medical necessity
    const result = await generateMedicalNecessity(input);

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to generate medical necessity",
        },
        { status: 500 }
      );
    }

    // Get current version number (for versioning)
    const { data: existingSummaries } = await supabase
      .from("pa_summary")
      .select("version")
      .eq("pa_request_id", pa_request_id)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = existingSummaries?.[0]?.version
      ? existingSummaries[0].version + 1
      : 1;

    // Insert summary into database
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const summaryInsert: PaSummaryInsert = {
      pa_request_id,
      medical_necessity_text: result.data.medical_necessity_text,
      indications_text: result.data.indications_text,
      risk_benefit_text: result.data.risk_benefit_text,
      generated_by_model: result.model || "claude-3-5-sonnet-20241022",
      version: nextVersion,
    };

    const { data: summary, error: insertError } = await supabaseAdmin
      .from("pa_summary")
      .insert(summaryInsert)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert medical necessity summary:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to save medical necessity summary" },
        { status: 500 }
      );
    }

    const summaryRow = summary as PaSummaryRow | null;

    return NextResponse.json({
      success: true,
      data: {
        summary: summaryRow,
        llm_metadata: {
          model: result.model,
          usage: result.usage,
        },
      },
    });
  } catch (error) {
    console.error("Medical necessity generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
