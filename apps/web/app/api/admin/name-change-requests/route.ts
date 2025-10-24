/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Admin Name Change Requests | Status: DISABLED | Modified: 2025-10-24
 *
 * DISABLED: This feature requires name_change_request and notification tables
 * which are not yet in the schema. Enable after migrations are added.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Name change requests feature is not yet implemented",
    },
    { status: 501 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: "Name change requests feature is not yet implemented",
    },
    { status: 501 }
  );
}
