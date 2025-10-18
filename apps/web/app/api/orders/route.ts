/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Orders | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getOrgContext } from "../_lib/org";

type OrderInsert = Database["public"]["Tables"]["order"]["Insert"];

/**
 * GET /api/orders?org_id=xxx
 * List orders for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId } = await getOrgContext(request, searchParams.get("org_id"));

    const { data, error } = await supabaseAdmin
      .from("order")
      .select(
        `
        *,
        patient:patient_id(*),
        provider:provider_id(*)
      `
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Order list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create new order
 *
 * Body:
 * {
 *   org_id: string,
 *   patient_id: string,
 *   provider_id: string,
 *   modality: string,
 *   cpt_codes: string[],
 *   icd10_codes: string[],
 *   clinic_notes_text?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId } = await getOrgContext(request, body.org_id ?? null);
    const {
      patient_id,
      provider_id,
      modality,
      cpt_codes,
      icd10_codes,
      clinic_notes_text,
    } = body;

    if (
      !patient_id ||
      !provider_id ||
      !modality ||
      !cpt_codes ||
      !icd10_codes
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes",
        },
        { status: 400 }
      );
    }

    // Validate arrays
    if (!Array.isArray(cpt_codes) || !Array.isArray(icd10_codes)) {
      return NextResponse.json(
        { success: false, error: "cpt_codes and icd10_codes must be arrays" },
        { status: 400 }
      );
    }

    const order: OrderInsert = {
      org_id: orgId,
      patient_id,
      provider_id,
      modality,
      cpt_codes,
      icd10_codes,
      clinic_notes_text: clinic_notes_text || null,
    };

    const { data, error } = await supabaseAdmin
      .from("order")
      .insert(order)
      .select()
      .single();

    if (error) {
      throw new HttpError(
        error.message.includes("access") ? 403 : 500,
        error.message
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Order creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
