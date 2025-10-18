/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Check Email Availability | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";

/**
 * POST /api/auth/check-email
 *
 * Checks if an email address is already registered
 *
 * Body:
 * {
 *   email: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   available: boolean,
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if email exists in auth.users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Error checking email:", error);
      return NextResponse.json(
        { success: false, error: "Failed to check email availability" },
        { status: 500 }
      );
    }

    const emailExists = data.users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    return NextResponse.json({
      success: true,
      available: !emailExists,
      message: emailExists
        ? "Email is already registered"
        : "Email is available",
    });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
