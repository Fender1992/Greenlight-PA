/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/ocr/adapter | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

/**
 * OCR Result
 */
export interface OCRResult {
  text: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * OCR Adapter Interface
 */
export interface OCRAdapter {
  name: string;
  extractText(buffer: Buffer, mimeType: string): Promise<OCRResult>;
}

/**
 * Mock OCR Adapter (for testing and DEMO_MODE)
 */
export class MockOCRAdapter implements OCRAdapter {
  name = "mock";

  async extractText(buffer: Buffer, mimeType: string): Promise<OCRResult> {
    // In demo mode, return placeholder text
    return {
      text: `[DEMO MODE] Mock OCR extraction from ${mimeType} document (${buffer.length} bytes).\n\nThis would contain the extracted text from the uploaded document.\n\nIn production, this would use a real OCR service like:\n- Textract (AWS)\n- Document AI (Google Cloud)\n- Azure Computer Vision\n- Tesseract (open source)`,
      confidence: 0.95,
      metadata: {
        demo: true,
        file_size: buffer.length,
        mime_type: mimeType,
      },
    };
  }
}

/**
 * Textract OCR Adapter (AWS)
 * NOTE: Requires AWS credentials and @aws-sdk/client-textract
 */
export class TextractOCRAdapter implements OCRAdapter {
  name = "textract";

  async extractText(buffer: Buffer, mimeType: string): Promise<OCRResult> {
    // TODO: Implement AWS Textract integration
    // This would:
    // 1. Upload document to Textract
    // 2. Start document analysis job
    // 3. Poll for completion
    // 4. Extract text from response
    throw new Error("Textract OCR adapter not yet implemented");
  }
}

/**
 * Document AI OCR Adapter (Google Cloud)
 * NOTE: Requires GCP credentials and @google-cloud/documentai
 */
export class DocumentAIOCRAdapter implements OCRAdapter {
  name = "documentai";

  async extractText(buffer: Buffer, mimeType: string): Promise<OCRResult> {
    // TODO: Implement Google Cloud Document AI integration
    throw new Error("Document AI OCR adapter not yet implemented");
  }
}

/**
 * Factory function to get OCR adapter based on environment
 */
export function getOCRAdapter(): OCRAdapter {
  const ocrProvider = process.env.OCR_PROVIDER || "mock";

  switch (ocrProvider) {
    case "textract":
      return new TextractOCRAdapter();
    case "documentai":
      return new DocumentAIOCRAdapter();
    case "mock":
    default:
      return new MockOCRAdapter();
  }
}
