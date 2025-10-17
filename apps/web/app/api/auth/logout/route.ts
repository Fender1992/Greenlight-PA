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
export async function POST(request: Request) {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Auth] Logout error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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
