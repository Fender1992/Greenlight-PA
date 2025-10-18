/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Audit Log | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireUser, resolveOrgId } from "../_lib/org";

/**
 * GET /api/audit
 *
 * Query Parameters:
 * - org_id: Filter by organization
 * - user_id: Filter by user
 * - action: Filter by action type
 * - subject: Filter by subject type (pa_request, attachment, etc.)
 * - start_date: Filter by date range start
 * - end_date: Filter by date range end
 * - limit: Number of records (default: 100, max: 1000)
 * - offset: Pagination offset
 *
 * Returns paginated audit log entries
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await requireUser(request);

    const orgId = await resolveOrgId(user, searchParams.get("org_id"));
    const userId = searchParams.get("user_id");
    const action = searchParams.get("action");
    const subject = searchParams.get("subject");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabaseAdmin
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("at", { ascending: false });

    // Apply filters
    query = query.eq("org_id", orgId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (subject) {
      query = query.eq("subject", subject);
    }

    if (startDate) {
      query = query.gte("at", startDate);
    }

    if (endDate) {
      query = query.lte("at", endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[API] Audit log query error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("[API] Audit log error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch audit logs",
      },
      { status: 500 }
    );
  }
}
