/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Logout | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextResponse } from "next/server";
import { supabase } from "@greenlight/db";

/**
 * POST /api/auth/logout
 *
 * Signs out the current user
 */
export async function POST(_request: Request) {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Auth] Logout error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Create response and clear session cookies
    const response = NextResponse.json({ success: true });

    // Clear both access and refresh tokens
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");

    return response;
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
      },
      { status: 500 }
    );
  }
}
