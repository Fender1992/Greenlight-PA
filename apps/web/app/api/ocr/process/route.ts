/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: OCR Processing | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, supabase, supabaseAdmin } from "@greenlight/db";
import { getOCRAdapter } from "@greenlight/ocr";

/**
 * POST /api/ocr/process
 * Process OCR for an attachment
 *
 * Body:
 * {
 *   attachment_id: string
 * }
 *
 * This endpoint:
 * 1. Fetches the attachment from storage
 * 2. Runs OCR extraction
 * 3. Updates attachment record with extracted text
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attachment_id } = body;

    if (!attachment_id) {
      return NextResponse.json(
        { success: false, error: "Missing attachment_id" },
        { status: 400 }
      );
    }

    // Get attachment metadata (RLS protected)
    const { data: attachment, error: attachmentError } = await supabase
      .from("attachment")
      .select("*")
      .eq("id", attachment_id)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { success: false, error: "Attachment not found or access denied" },
        { status: 404 }
      );
    }

    // Check if OCR already done
    if (attachment.ocr_text) {
      return NextResponse.json({
        success: true,
        data: {
          attachment_id,
          ocr_text: attachment.ocr_text,
          already_processed: true,
        },
      });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("attachments")
      .download(attachment.storage_path);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return NextResponse.json(
        { success: false, error: "Failed to download attachment" },
        { status: 500 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine MIME type
    const mimeType = fileData.type || "application/octet-stream";

    // Get OCR adapter and process
    const ocrAdapter = getOCRAdapter();
    let ocrResult;

    try {
      ocrResult = await ocrAdapter.extractText(buffer, mimeType);
    } catch (ocrError) {
      console.error("OCR extraction error:", ocrError);
      return NextResponse.json(
        {
          success: false,
          error:
            ocrError instanceof Error
              ? `OCR failed: ${ocrError.message}`
              : "OCR processing failed",
        },
        { status: 500 }
      );
    }

    // Update attachment with OCR text (use admin client to bypass RLS)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { data: updatedAttachment, error: updateError } = await supabaseAdmin
      .from("attachment")
      .update({ ocr_text: ocrResult.text })
      .eq("id", attachment_id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update attachment:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to save OCR result: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        attachment_id: updatedAttachment.id,
        ocr_text: updatedAttachment.ocr_text,
        confidence: ocrResult.confidence,
        adapter: ocrAdapter.name,
      },
    });
  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
