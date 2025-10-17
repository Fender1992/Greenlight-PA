/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Auth Callback | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextResponse } from "next/server";
import { supabase } from "@greenlight/db";

/**
 * GET /api/auth/callback
 *
 * Handles Supabase Auth callbacks (email confirmation, magic links, OAuth)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error("[Auth] Error exchanging code for session:", error);
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", request.url)
      );
    }
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
