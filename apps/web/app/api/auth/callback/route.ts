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
      const { data } = await supabase.auth.exchangeCodeForSession(code);

      // Check if user needs provisioning (org/member records)
      if (data.user) {
        try {
          await fetch(`${new URL(request.url).origin}/api/auth/provision`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
            }),
          });
        } catch (provisionError) {
          console.error("[Auth] Provisioning error:", provisionError);
          // Don't block login if provisioning fails
        }
      }
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
