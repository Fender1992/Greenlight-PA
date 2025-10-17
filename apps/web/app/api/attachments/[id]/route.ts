/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Single Attachment | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, getCurrentUser } from "@greenlight/db";

/**
 * GET /api/attachments/[id]
 * Get attachment metadata and signed URL for download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get attachment metadata (RLS protected)
    const { data: attachment, error } = await supabase
      .from("attachment")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Generate signed URL for download (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("attachments")
      .createSignedUrl(attachment.storage_path, 3600);

    if (urlError) {
      console.error("Signed URL error:", urlError);
      return NextResponse.json(
        { success: false, error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...attachment,
        download_url: signedUrlData.signedUrl,
      },
    });
  } catch (error) {
    console.error("Attachment get error:", error);
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
 * DELETE /api/attachments/[id]
 * Delete attachment (metadata + storage)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get attachment to find storage path
    const { data: attachment, error: fetchError } = await supabase
      .from("attachment")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("attachments")
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with DB deletion even if storage fails
    }

    // Delete from database (RLS will ensure user has access)
    const { error: dbError } = await supabase
      .from("attachment")
      .delete()
      .eq("id", id);

    if (dbError) {
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error("Attachment delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
