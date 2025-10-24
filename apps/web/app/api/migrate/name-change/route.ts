/**
 * Temporary API endpoint to run database migrations
 * Status: DISABLED - Use proper migration system instead
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Migration endpoints are disabled. Use proper migration tools.",
    },
    { status: 501 }
  );
}
