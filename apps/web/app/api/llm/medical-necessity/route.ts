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

    // Fetch PA request with full details
    const { data: paRequest, error: paError } = await supabase
      .from("pa_request")
      .select(
        `
        *,
        order:order_id(
          *,
          patient:patient_id(*)
        ),
        payer:payer_id(*)
      `
      )
      .eq("id", pa_request_id)
      .single();

    if (paError || !paRequest) {
      return NextResponse.json(
        { success: false, error: "PA request not found or access denied" },
        { status: 404 }
      );
    }

    const order = paRequest.order as any;
    const patient = order.patient as any;
    const payer = paRequest.payer as any;

    // Fetch relevant policy snippets for criteria
    const { data: policySnippets } = await supabase
      .from("policy_snippet")
      .select("snippet_text")
      .eq("payer_id", payer.id)
      .ilike("modality", `%${order.modality}%`)
      .limit(5);

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
        sex: patient.sex,
      },
      modality: order.modality,
      cpt_codes: order.cpt_codes || [],
      icd10_codes: order.icd10_codes || [],
      clinic_notes: order.clinic_notes_text || "No clinical notes provided.",
      policy_criteria: policySnippets?.map((p) => p.snippet_text) || [],
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

    const { data: summary, error: insertError } = await supabaseAdmin
      .from("pa_summary")
      .insert({
        pa_request_id,
        medical_necessity_text: result.data.medical_necessity_text,
        indications_text: result.data.indications_text,
        risk_benefit_text: result.data.risk_benefit_text,
        generated_by_model: result.model || "claude-3-5-sonnet-20241022",
        version: nextVersion,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert medical necessity summary:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to save medical necessity summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
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
