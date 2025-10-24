/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PA Requests | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getOrgContext } from "../_lib/org";
import { validatePaRequestCreate } from "@web/lib/validation";

type PARequestInsert = Database["public"]["Tables"]["pa_request"]["Insert"];
type StatusEventInsert = Database["public"]["Tables"]["status_event"]["Insert"];
type OrderRow = Database["public"]["Tables"]["order"]["Row"];

/**
 * GET /api/pa-requests?org_id=xxx&status=xxx&patient_id=xxx
 * List PA requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId, client } = await getOrgContext(
      request,
      searchParams.get("org_id"),
      { allowAmbiguous: true } // Allow listing PAs for single-org users without explicit org_id
    );
    const status = searchParams.get("status") || undefined;
    const patientId = searchParams.get("patient_id") || undefined;
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") ?? "", 10) || 50, 1),
      100
    );
    const offset = Math.max(
      Number.parseInt(searchParams.get("offset") ?? "", 10) || 0,
      0
    );

    let query = client
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
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

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

    return NextResponse.json({
      success: true,
      data: filtered,
      pagination: { limit, offset },
    });
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
    const validation = validatePaRequestCreate(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, issues: validation.issues },
        { status: 400 }
      );
    }

    const { user, orgId, client } = await getOrgContext(
      request,
      validation.data.org_id ?? null
    );

    const payload: PARequestInsert = {
      org_id: orgId,
      order_id: validation.data.order_id,
      payer_id: validation.data.payer_id,
      priority: validation.data.priority,
      status: "draft",
      created_by: user.id,
    };

    const { data, error } = await client
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

    const auditEvent: StatusEventInsert = {
      pa_request_id: data.id,
      status: "draft",
      note: "PA request created",
      actor: user.id,
    };

    const { error: statusEventError } = await client
      .from("status_event")
      .insert(auditEvent);
    if (statusEventError) {
      console.error(
        "Failed to record PA creation audit event",
        statusEventError
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
