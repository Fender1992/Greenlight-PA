/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Super Admin Statistics | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireUser, isSuperAdmin } from "../../_lib/org";

/**
 * GET /api/super-admin/stats
 *
 * Get platform-wide statistics (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Check if user is super admin
    const superAdmin = await isSuperAdmin(user.id);
    if (!superAdmin) {
      throw new HttpError(403, "Super admin access required");
    }

    // Get organization count
    const { count: orgCount } = await supabaseAdmin
      .from("org")
      .select("*", { count: "exact", head: true });

    // Get total user count (active members)
    const { count: userCount } = await supabaseAdmin
      .from("member")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get pending members count
    const { count: pendingCount } = await supabaseAdmin
      .from("member")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get patient count
    const { count: patientCount } = await supabaseAdmin
      .from("patient")
      .select("*", { count: "exact", head: true });

    // Get PA request count
    const { count: paRequestCount } = await supabaseAdmin
      .from("pa_request")
      .select("*", { count: "exact", head: true });

    // Get orders count
    const { count: orderCount } = await supabaseAdmin
      .from("order")
      .select("*", { count: "exact", head: true });

    // Get payers count
    const { count: payerCount } = await supabaseAdmin
      .from("payer")
      .select("*", { count: "exact", head: true });

    // Get super admin count
    const { count: superAdminCount } = await supabaseAdmin
      .from("super_admin")
      .select("*", { count: "exact", head: true });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentPARequests } = await supabaseAdmin
      .from("pa_request")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    const { count: recentOrders } = await supabaseAdmin
      .from("order")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    const { count: recentOrgs } = await supabaseAdmin
      .from("org")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          organizations: orgCount || 0,
          users: userCount || 0,
          pendingMembers: pendingCount || 0,
          patients: patientCount || 0,
          paRequests: paRequestCount || 0,
          orders: orderCount || 0,
          payers: payerCount || 0,
          superAdmins: superAdminCount || 0,
        },
        recentActivity: {
          paRequests: recentPARequests || 0,
          orders: recentOrders || 0,
          organizations: recentOrgs || 0,
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

    console.error("Super admin stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch statistics",
      },
      { status: 500 }
    );
  }
}
