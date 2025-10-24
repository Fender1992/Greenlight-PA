/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Super Admin Organizations | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireUser, isSuperAdmin } from "../../_lib/org";

/**
 * GET /api/super-admin/organizations
 *
 * Get all organizations with member counts (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Check if user is super admin
    const superAdmin = await isSuperAdmin(user.id);
    if (!superAdmin) {
      throw new HttpError(403, "Super admin access required");
    }

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from("org")
      .select("*")
      .order("created_at", { ascending: false });

    if (orgsError) {
      throw new HttpError(500, orgsError.message);
    }

    // Get member counts for each org
    const orgsWithCounts = await Promise.all(
      (orgs || []).map(async (org) => {
        // Get total members
        const { count: totalMembers } = await supabaseAdmin
          .from("member")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org.id);

        // Get active members
        const { count: activeMembers } = await supabaseAdmin
          .from("member")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("status", "active");

        // Get pending members
        const { count: pendingMembers } = await supabaseAdmin
          .from("member")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("status", "pending");

        // Get patient count
        const { count: patientCount } = await supabaseAdmin
          .from("patient")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org.id);

        // Get PA request count
        const { count: paRequestCount } = await supabaseAdmin
          .from("pa_request")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org.id);

        return {
          ...org,
          stats: {
            totalMembers: totalMembers || 0,
            activeMembers: activeMembers || 0,
            pendingMembers: pendingMembers || 0,
            patients: patientCount || 0,
            paRequests: paRequestCount || 0,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: orgsWithCounts,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Super admin organizations error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch organizations",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/organizations
 *
 * Create a new organization (super admin only)
 * Body: { name: string, domain?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Check if user is super admin
    const superAdmin = await isSuperAdmin(user.id);
    if (!superAdmin) {
      throw new HttpError(403, "Super admin access required");
    }

    const body = await request.json();
    const { name, domain } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new HttpError(400, "Organization name is required");
    }

    // Create the organization
    const { data: newOrg, error: createError } = await supabaseAdmin
      .from("org")
      .insert({
        name: name.trim(),
        domain: domain?.trim() || null,
      })
      .select()
      .single();

    if (createError) {
      throw new HttpError(500, createError.message);
    }

    return NextResponse.json({
      success: true,
      data: newOrg,
      message: "Organization created successfully",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Super admin create organization error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create organization",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/organizations?org_id=xxx
 *
 * Delete an organization and all related data (super admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Check if user is super admin
    const superAdmin = await isSuperAdmin(user.id);
    if (!superAdmin) {
      throw new HttpError(403, "Super admin access required");
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id");

    if (!orgId) {
      throw new HttpError(400, "org_id parameter required");
    }

    // Delete the organization (CASCADE will handle related data)
    const { error: deleteError } = await supabaseAdmin
      .from("org")
      .delete()
      .eq("id", orgId);

    if (deleteError) {
      throw new HttpError(500, deleteError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Super admin delete organization error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete organization",
      },
      { status: 500 }
    );
  }
}
