/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PA Requests | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getPARequestsByOrg,
  createPARequest,
} from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";

type PARequestInsert = Database["public"]["Tables"]["pa_request"]["Insert"];

/**
 * GET /api/pa-requests?org_id=xxx&status=xxx&patient_id=xxx
 * List PA requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id");
    const status = searchParams.get("status");
    const patientId = searchParams.get("patient_id");

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Missing org_id parameter" },
        { status: 400 }
      );
    }

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { org_id, order_id, payer_id, priority } = body;

    if (!org_id || !order_id || !payer_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: org_id, order_id, payer_id",
        },
        { status: 400 }
      );
    }

    const paRequest: PARequestInsert = {
      org_id,
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
