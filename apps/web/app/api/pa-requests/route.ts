/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PA Requests | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getPARequestsByOrg, createPARequest } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, requireUser, resolveOrgId } from "../_lib/org";

type PARequestInsert = Database["public"]["Tables"]["pa_request"]["Insert"];

/**
 * GET /api/pa-requests?org_id=xxx&status=xxx&patient_id=xxx
 * List PA requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const orgId = await resolveOrgId(searchParams.get("org_id"));
    const status = searchParams.get("status");
    const patientId = searchParams.get("patient_id");

    const result = await getPARequestsByOrg(orgId, {
      status: status || undefined,
      patientId: patientId || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
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
    const user = await requireUser();

    const body = await request.json();
    const { org_id, order_id, payer_id, priority } = body;

    const orgId = await resolveOrgId(org_id);

    if (!order_id || !payer_id) {
      throw new HttpError(400, "Missing required fields: order_id, payer_id");
    }

    const paRequest: PARequestInsert = {
      org_id: orgId,
      order_id,
      payer_id,
      priority: priority || "standard",
      status: "draft",
      created_by: user.id,
    };

    const result = await createPARequest(paRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error.includes("access") ? 403 : 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
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
