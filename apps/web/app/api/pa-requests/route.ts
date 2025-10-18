/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PA Requests | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getOrgContext } from "../_lib/org";

type PARequestInsert = Database["public"]["Tables"]["pa_request"]["Insert"];
type OrderRow = Database["public"]["Tables"]["order"]["Row"];

/**
 * GET /api/pa-requests?org_id=xxx&status=xxx&patient_id=xxx
 * List PA requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId } = await getOrgContext(request, searchParams.get("org_id"));
    const status = searchParams.get("status") || undefined;
    const patientId = searchParams.get("patient_id") || undefined;

    let query = supabaseAdmin
      .from("pa_request")
      .select(
        `
        *,
        order:order_id(
          *,
          patient:patient_id(*),
          provider:provider_id(*)
        ),
        payer:payer_id(*)
      `
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      throw new HttpError(500, error.message);
    }

    const filtered =
      patientId && data
        ? data.filter(
            (row) =>
              (row.order as unknown as OrderRow | null)?.patient_id ===
              patientId
          )
        : data;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("PA request list error:", error);
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
 * POST /api/pa-requests
 * Create new PA request
 *
 * Body:
 * {
 *   org_id: string,
 *   order_id: string,
 *   payer_id: string,
 *   priority?: 'standard' | 'urgent'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, orgId } = await getOrgContext(request, body.org_id ?? null);

    const { order_id, payer_id, priority } = body;
    if (!order_id || !payer_id) {
      throw new HttpError(400, "Missing required fields: order_id, payer_id");
    }

    const payload: PARequestInsert = {
      org_id: orgId,
      order_id,
      payer_id,
      priority: priority || "standard",
      status: "draft",
      created_by: user.id,
    };

    const { data, error } = await supabaseAdmin
      .from("pa_request")
      .insert(payload)
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

    console.error("PA request creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
