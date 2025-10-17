/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: OCR Batch Job | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { getOCRAdapter } from "@greenlight/ocr";

/**
 * POST /api/jobs/ocr-batch
 * Background job to process all pending OCR tasks
 *
 * This can be called:
 * - Manually via API
 * - Via cron (Vercel Cron Jobs)
 * - Via webhook after attachment upload
 *
 * Auth: Requires API key for background jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Verify job authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dev-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin client not configured" },
        { status: 500 }
      );
    }

    // Find attachments without OCR text
    const { data: attachments, error: fetchError } = await supabaseAdmin
      .from("attachment")
      .select("*")
      .is("ocr_text", null)
      .limit(10); // Process 10 at a time

    if (fetchError) {
      console.error("Failed to fetch pending OCR tasks:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch pending tasks" },
        { status: 500 }
      );
    }

    if (!attachments || attachments.length === 0) {
      return NextResponse.json({
        success: true,
        data: { processed: 0, message: "No pending OCR tasks" },
      });
    }

    const ocrAdapter = getOCRAdapter();
    const results = [];

    // Process each attachment
    for (const attachment of attachments) {
      try {
        // Download file from storage
        const { data: fileData, error: downloadError } =
          await supabaseAdmin.storage
            .from("attachments")
            .download(attachment.storage_path);

        if (downloadError || !fileData) {
          console.error(
            `Failed to download attachment ${attachment.id}:`,
            downloadError
          );
          results.push({
            id: attachment.id,
            success: false,
            error: "Download failed",
          });
          continue;
        }

        // Convert to buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = fileData.type || "application/octet-stream";

        // Run OCR
        const ocrResult = await ocrAdapter.extractText(buffer, mimeType);

        // Update attachment with OCR text
        const { error: updateError } = await supabaseAdmin
          .from("attachment")
          .update({ ocr_text: ocrResult.text })
          .eq("id", attachment.id);

        if (updateError) {
          console.error(
            `Failed to update attachment ${attachment.id}:`,
            updateError
          );
          results.push({
            id: attachment.id,
            success: false,
            error: "Update failed",
          });
          continue;
        }

        results.push({
          id: attachment.id,
          success: true,
          confidence: ocrResult.confidence,
        });
      } catch (error) {
        console.error(`OCR processing error for ${attachment.id}:`, error);
        results.push({
          id: attachment.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      },
    });
  } catch (error) {
    console.error("Batch OCR job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
