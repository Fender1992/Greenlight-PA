/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: LLM Checklist Generation | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, supabase, supabaseAdmin } from "@greenlight/db";
import {
  generateChecklist,
  type ChecklistGenerationInput,
} from "@greenlight/llm";

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

    // Fetch PA request with order and payer details
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
    const payer = paRequest.payer as any;

    // Fetch relevant policy snippets
    const { data: policySnippets } = await supabase
      .from("policy_snippet")
      .select("snippet_text")
      .eq("payer_id", payer.id)
      .ilike("modality", `%${order.modality}%`)
      .limit(3);

    // Prepare input for LLM
    const input: ChecklistGenerationInput = {
      modality: order.modality,
      cpt_codes: order.cpt_codes || [],
      icd10_codes: order.icd10_codes || [],
      payer_name: payer.name,
      policy_snippets: policySnippets?.map((p) => p.snippet_text) || [],
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

    // Insert checklist items into database
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const checklistItems = result.data.map((item) => ({
      pa_request_id,
      name: item.name,
      rationale: item.rationale,
      required_bool: item.required_bool,
      status: "pending" as const,
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
