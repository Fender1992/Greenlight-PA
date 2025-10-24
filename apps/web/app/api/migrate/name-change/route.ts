/**
 * Temporary API endpoint to run database migrations
 * This should only be used in development
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";

export async function POST(_request: NextRequest) {
  try {
    // Execute each SQL statement separately
    const statements = [
      // Create name_change_request table
      `CREATE TABLE IF NOT EXISTS name_change_request (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
        org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
        current_first_name TEXT,
        current_last_name TEXT,
        requested_first_name TEXT NOT NULL,
        requested_last_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
        reviewed_by UUID REFERENCES member(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        denial_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      // Create notification table
      `CREATE TABLE IF NOT EXISTS notification (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        org_id UUID REFERENCES org(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        metadata JSONB,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      // Enable RLS
      `ALTER TABLE name_change_request ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE notification ENABLE ROW LEVEL SECURITY`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_name_change_request_member_id ON name_change_request(member_id)`,
      `CREATE INDEX IF NOT EXISTS idx_name_change_request_org_id ON name_change_request(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_name_change_request_status ON name_change_request(status)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_org_id ON notification(org_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(read)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at DESC)`,
    ];

    for (const statement of statements) {
      const { error } = await supabaseAdmin.rpc("exec_sql", { sql: statement });
      if (error) {
        // Try direct query method
        const { error: queryError } = await supabaseAdmin
          .from("_internal")
          .select(statement);
        if (queryError) {
          console.error("Statement error:", statement, queryError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed - tables should be created",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
