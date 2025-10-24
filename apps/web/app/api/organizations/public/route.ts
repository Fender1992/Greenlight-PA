/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Public Organizations | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";

/**
 * GET /api/organizations/public
 *
 * List all organizations available for users to join
 * Public endpoint (no auth required) for signup flow
 *
 * Query params:
 * - q: search term (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.toLowerCase() ?? "";

    let query = supabaseAdmin
      .from("org")
      .select("id, name, npi, created_at")
      .order("name");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Organization list error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch organizations",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Organization list error:", error);
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
