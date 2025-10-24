/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Name Change Request | Status: DISABLED | Modified: 2025-10-24
 *
 * DISABLED: This feature requires name_change_request table which is not yet in the schema.
 * Enable after migration is added.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Name change request feature is not yet implemented",
    },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Name change request feature is not yet implemented",
    },
    { status: 501 }
  );
}
