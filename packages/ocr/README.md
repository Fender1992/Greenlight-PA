# @greenlight/ocr

OCR (Optical Character Recognition) adapters for Greenlight PA.

## Features

- Multiple OCR provider support (mock, Textract, Document AI)
- Consistent interface across adapters
- Buffer-based processing
- Confidence scoring
- Metadata support

## Adapters

### MockOCRAdapter (Demo Mode)

Returns placeholder text for testing and development.

```typescript
import { MockOCRAdapter } from "@greenlight/ocr";

const adapter = new MockOCRAdapter();
const result = await adapter.extractText(buffer, "application/pdf");
console.log(result.text);
```

### TextractOCRAdapter (AWS)

**Status**: Not yet implemented

Uses AWS Textract for document text extraction.

Requirements:

- `@aws-sdk/client-textract`
- AWS credentials configured

### DocumentAIOCRAdapter (Google Cloud)

**Status**: Not yet implemented

Uses Google Cloud Document AI for document text extraction.

Requirements:

- `@google-cloud/documentai`
- GCP credentials configured

## Usage

### Automatic Adapter Selection

```typescript
import { getOCRAdapter } from "@greenlight/ocr";

// Automatically selects adapter based on OCR_PROVIDER env var
const adapter = getOCRAdapter();
const result = await adapter.extractText(buffer, mimeType);
```

### Environment Variables

```bash
# .env.local
OCR_PROVIDER=mock  # or 'textract' or 'documentai'
```

### Manual Adapter Selection

```typescript
import { MockOCRAdapter, TextractOCRAdapter } from "@greenlight/ocr";

const adapter =
  process.env.OCR_PROVIDER === "textract"
    ? new TextractOCRAdapter()
    : new MockOCRAdapter();

const result = await adapter.extractText(buffer, mimeType);
```

## OCR Result Format

```typescript
interface OCRResult {
  text: string; // Extracted text
  confidence?: number; // Confidence score (0-1)
  metadata?: Record<string, unknown>; // Provider-specific metadata
}
```

## API Integration

OCR is triggered via the API endpoint:

```bash
POST /api/ocr/process
Content-Type: application/json

{
  "attachment_id": "uuid-here"
}
```

This endpoint:

1. Fetches the attachment from Supabase Storage
2. Runs OCR extraction using the configured adapter
3. Updates the `attachment.ocr_text` field with results

## Supported File Types

- PDF documents
- Images (JPEG, PNG, TIFF)
- Scanned documents

## Future Enhancements

1. **Layout Analysis**: Extract structured data (tables, forms)
2. **Language Detection**: Identify document language
3. **Batch Processing**: Process multiple documents in parallel
4. **Caching**: Cache OCR results by SHA256 hash
5. **Progress Tracking**: Real-time OCR job status updates
