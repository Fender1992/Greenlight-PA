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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[Auth] Exchange error:", error);
        return NextResponse.redirect(
          new URL("/?error=auth_failed", request.url)
        );
      }

      if (!data.session) {
        console.error("[Auth] No session returned from code exchange");
        return NextResponse.redirect(
          new URL("/?error=no_session", request.url)
        );
      }

      // Create response with redirect
      const redirectUrl = new URL("/dashboard", origin);
      const response = NextResponse.redirect(redirectUrl);

      // Set session cookies that the API routes can read
      // Note: These cookies need to match what extractAccessToken() expects in org.ts
      // httpOnly is set to true for security - prevents XSS attacks from stealing tokens
      const cookieOptions = {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax" as const,
        httpOnly: true, // Security: Prevents JavaScript from accessing the token
        secure: process.env.NODE_ENV === "production",
      };

      // Set the access token cookie (httpOnly for security)
      response.cookies.set(
        "sb-access-token",
        data.session.access_token,
        cookieOptions
      );

      // Set the refresh token cookie (also httpOnly for security)
      response.cookies.set(
        "sb-refresh-token",
        data.session.refresh_token,
        cookieOptions
      );

      // Check if user needs provisioning (org/member records)
      if (data.user) {
        try {
          await fetch(`${origin}/api/auth/provision`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
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

      return response;
    } catch (error) {
      console.error("[Auth] Error exchanging code for session:", error);
      return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
    }
  }

  // No code provided, redirect to dashboard anyway
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
