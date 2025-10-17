/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Metrics & Analytics | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";

/**
 * GET /api/metrics
 *
 * Query Parameters:
 * - org_id: Organization ID (required)
 * - time_range: 7d, 30d, 90d, 1y (default: 30d)
 *
 * Returns aggregated metrics for dashboards
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id");
    const timeRange = searchParams.get("time_range") || "30d";

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "org_id is required" },
        { status: 400 }
      );
    }

    // Calculate date range
    const now = new Date();
    const daysAgo =
      {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365,
      }[timeRange] || 30;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch PA requests for the time range
    const { data: paRequests, error: paError } = await supabaseAdmin
      .from("pa_request")
      .select("id, status, priority, payer_id, submitted_at, created_at")
      .eq("org_id", orgId)
      .gte("created_at", startDate.toISOString());

    if (paError) {
      console.error("[API] Metrics query error:", paError);
      return NextResponse.json(
        { success: false, error: paError.message },
        { status: 500 }
      );
    }

    // Calculate overall metrics
    const totalRequests = paRequests?.length || 0;
    const approvedCount =
      paRequests?.filter((r) => r.status === "approved").length || 0;
    const deniedCount =
      paRequests?.filter((r) => r.status === "denied").length || 0;
    const urgentCount =
      paRequests?.filter((r) => r.priority === "urgent").length || 0;

    const approvalRate =
      totalRequests > 0
        ? ((approvedCount / (approvedCount + deniedCount)) * 100).toFixed(1)
        : 0;

    // Calculate average turnaround time
    const submittedRequests = paRequests?.filter((r) => r.submitted_at) || [];
    let avgTurnaroundDays = 0;
    if (submittedRequests.length > 0) {
      const totalDays = submittedRequests.reduce((sum, req) => {
        const created = new Date(req.created_at);
        const submitted = new Date(req.submitted_at!);
        const days =
          (submitted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgTurnaroundDays = parseFloat(
        (totalDays / submittedRequests.length).toFixed(1)
      );
    }

    // Status breakdown
    const byStatus =
      paRequests?.reduce(
        (acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ) || {};

    // Payer breakdown
    const payerCounts =
      paRequests?.reduce(
        (acc, req) => {
          if (req.payer_id) {
            acc[req.payer_id] = (acc[req.payer_id] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      ) || {};

    // Monthly trend (last 4 months)
    const monthlyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0
      );

      const monthRequests =
        paRequests?.filter((r) => {
          const createdDate = new Date(r.created_at);
          return createdDate >= monthStart && createdDate <= monthEnd;
        }) || [];

      const monthApproved = monthRequests.filter(
        (r) => r.status === "approved"
      ).length;
      const monthDenied = monthRequests.filter(
        (r) => r.status === "denied"
      ).length;
      const monthApprovalRate =
        monthApproved + monthDenied > 0
          ? ((monthApproved / (monthApproved + monthDenied)) * 100).toFixed(1)
          : 0;

      monthlyTrend.push({
        month: monthDate.toLocaleDateString("en-US", { month: "short" }),
        requests: monthRequests.length,
        approvalRate: parseFloat(monthApprovalRate),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          totalRequests,
          approvalRate: parseFloat(approvalRate),
          avgTurnaroundDays,
          urgentRequests: urgentCount,
        },
        byStatus,
        payerCounts,
        trends: monthlyTrend,
      },
    });
  } catch (error) {
    console.error("[API] Metrics error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch metrics",
      },
      { status: 500 }
    );
  }
}
