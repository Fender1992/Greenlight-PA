/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Attachments Upload | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@greenlight/db";
import type { Database } from "@greenlight/db";
import crypto from "crypto";
import { HttpError, requireUser, resolveOrgId } from "../_lib/org";

/**
 * POST /api/attachments
 * Upload attachment with multipart form data
 *
 * Body:
 * - file: File (required)
 * - org_id: string (required)
 * - type: attachment_type (required)
 *
 * Returns:
 * - { success: true, data: { id, storage_path, sha256 } }
 * - { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireUser();

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orgId = await resolveOrgId(formData.get("org_id") as string | null);
    const type = formData.get("type") as string | null;

    if (!file || !type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: file, type",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Validate attachment type
    if (!ATTACHMENT_TYPES.includes(type as AttachmentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${ATTACHMENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const attachmentType = type as AttachmentType;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate SHA256 hash
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // Generate storage path: org_id/attachments/yyyy-mm-dd/sha256-filename
    const date = new Date().toISOString().split("T")[0];
    const storagePath = `${orgId}/attachments/${date}/${sha256}-${file.name}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Create attachment record in database
    const { data: attachmentData, error: dbError } = await supabase
      .from("attachment")
      .insert({
        org_id: orgId,
        storage_path: storagePath,
        type: attachmentType,
        sha256,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Clean up uploaded file
      await supabase.storage.from("attachments").remove([storagePath]);
      return NextResponse.json(
        { success: false, error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    const attachmentRecord = attachmentData as AttachmentRow;

    return NextResponse.json({
      success: true,
      data: {
        id: attachmentRecord.id,
        storage_path: attachmentRecord.storage_path,
        sha256: attachmentRecord.sha256,
        type: attachmentRecord.type,
        uploaded_by: attachmentRecord.uploaded_by,
        created_at: attachmentRecord.created_at,
      },
    });
  } catch (error) {
    console.error("Attachment upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attachments?org_id=xxx
 * List attachments for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = await resolveOrgId(searchParams.get("org_id"));

    // RLS will automatically filter to user's org
    const { data, error } = await supabase
      .from("attachment")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Attachment list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
const ATTACHMENT_TYPES = [
  "order",
  "imaging",
  "lab",
  "notes",
  "payer_form",
  "appeal",
  "other",
] as const;

type AttachmentType = (typeof ATTACHMENT_TYPES)[number];
type AttachmentRow = Database["public"]["Tables"]["attachment"]["Row"];
