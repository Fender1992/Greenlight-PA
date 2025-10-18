/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: LLM Checklist Generation | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import {
  generateChecklist,
  type ChecklistGenerationInput,
} from "@greenlight/llm";
import type { Database } from "@greenlight/db";
import { requireUser, resolveOrgId, HttpError } from "../../_lib/org";

type Tables = Database["public"]["Tables"];
type PaRequestRow = Tables["pa_request"]["Row"];
type OrderRow = Tables["order"]["Row"];
type PayerRow = Tables["payer"]["Row"];
type ChecklistInsert = Tables["pa_checklist_item"]["Insert"];
type PolicySnippetRow = Tables["policy_snippet"]["Row"];

/**
 * POST /api/llm/checklist
 * Generate checklist items for a PA request using LLM
 *
 * Body:
 * {
 *   pa_request_id: string
 * }
 *
 * This endpoint:
 * 1. Fetches PA request with order and payer details
 * 2. Fetches relevant policy snippets
 * 3. Generates checklist using Claude
 * 4. Inserts checklist items into database
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

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

    const { data: paRequest, error: paError } = await supabaseAdmin
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
    await resolveOrgId(user, paRequestRow.org_id);

    if (!paRequestRow.payer_id) {
      return NextResponse.json(
        { success: false, error: "PA request missing payer information" },
        { status: 400 }
      );
    }

    const [orderResult, payerResult] = await Promise.all([
      supabaseAdmin
        .from("order")
        .select("*")
        .eq("id", paRequestRow.order_id)
        .single(),
      supabaseAdmin
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

    const payer = payerResult.data as PayerRow | null;
    if (payerResult.error || !payer) {
      return NextResponse.json(
        { success: false, error: "Payer not found" },
        { status: 404 }
      );
    }

    // Fetch relevant policy snippets
    let snippetsQuery = supabaseAdmin
      .from("policy_snippet")
      .select("snippet_text")
      .eq("payer_id", payer.id);

    if (order.modality) {
      snippetsQuery = snippetsQuery.ilike("modality", `%${order.modality}%`);
    }

    const { data: policySnippets } = await snippetsQuery.limit(3);

    // Prepare input for LLM
    const input: ChecklistGenerationInput = {
      modality: order.modality,
      cpt_codes: order.cpt_codes ?? [],
      icd10_codes: order.icd10_codes ?? [],
      payer_name: payer.name,
      policy_snippets:
        policySnippets?.map(
          (p) => (p as Pick<PolicySnippetRow, "snippet_text">).snippet_text
        ) ?? [],
    };

    // Generate checklist
    const result = await generateChecklist(input);

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to generate checklist",
        },
        { status: 500 }
      );
    }

    const checklistItems: ChecklistInsert[] = result.data.map((item) => ({
      pa_request_id,
      name: item.name,
      rationale: item.rationale,
      required_bool: item.required_bool,
      status: "pending",
    }));

    const { data: insertedItems, error: insertError } = await supabaseAdmin
      .from("pa_checklist_item")
      .insert(checklistItems)
      .select();

    if (insertError) {
      console.error("Failed to insert checklist items:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to save checklist items" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        checklist_items: insertedItems,
        llm_metadata: {
          model: result.model,
          usage: result.usage,
        },
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Checklist generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
