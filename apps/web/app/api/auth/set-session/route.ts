/**
 * API Route: Set Session Cookies
 * Called by client after successful login to set cookies for API routes
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, refreshToken } = body;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { success: false, error: "Missing tokens" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Cookie options - httpOnly for security to prevent XSS attacks
    const cookieOptions = {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax" as const,
      httpOnly: true, // Security: Prevents JavaScript from accessing the token
      secure: process.env.NODE_ENV === "production",
    };

    // Set the access token cookie (httpOnly for security)
    response.cookies.set("sb-access-token", accessToken, cookieOptions);

    // Set the refresh token cookie (also httpOnly for security)
    response.cookies.set("sb-refresh-token", refreshToken, cookieOptions);

    return response;
  } catch (error) {
    console.error("[Auth] Set session error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set session",
      },
      { status: 500 }
    );
  }
}
