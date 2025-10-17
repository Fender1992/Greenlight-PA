# API Routes Documentation

**Last Updated:** 2025-10-17

---

## Overview

Greenlight PA uses Next.js 14 App Router API routes for all backend operations. All routes are authenticated and respect Row Level Security (RLS) policies at the database level.

---

## Authentication

All API routes require authentication via Supabase session cookie. Requests without valid auth will receive:

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Status Code:** `401`

---

## Response Format

All endpoints return a consistent response format:

**Success:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Endpoints

### Attachments

#### `POST /api/attachments`

Upload a new attachment with multipart form data.

**Request:**

- Content-Type: `multipart/form-data`
- Fields:
  - `file` (File, required) - File to upload (max 50MB)
  - `org_id` (string, required) - Organization ID
  - `type` (string, required) - Attachment type: `order`, `imaging`, `lab`, `notes`, `payer_form`, `appeal`, `other`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "storage_path": "org-id/attachments/2025-10-17/hash-filename.pdf",
    "sha256": "abcd1234...",
    "type": "order",
    "uploaded_by": "user-uuid",
    "created_at": "2025-10-17T12:00:00Z"
  }
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid input (missing fields, invalid type, file too large)
- `401` - Unauthorized
- `500` - Server error

---

#### `GET /api/attachments?org_id=xxx`

List attachments for an organization.

**Query Parameters:**

- `org_id` (string, required) - Organization ID

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "org-uuid",
      "storage_path": "path/to/file",
      "type": "order",
      "sha256": "hash",
      "ocr_text": "Extracted text..." | null,
      "uploaded_by": "user-uuid",
      "created_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

---

#### `GET /api/attachments/[id]`

Get single attachment with signed download URL.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "storage_path": "path/to/file",
    "download_url": "https://storage.example.com/signed-url?token=...",
    "type": "order",
    "sha256": "hash",
    "ocr_text": "Extracted text...",
    "created_at": "2025-10-17T12:00:00Z"
  }
}
```

**Note:** `download_url` is valid for 1 hour.

---

#### `DELETE /api/attachments/[id]`

Delete attachment (both metadata and file from storage).

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "deleted": true
  }
}
```

---

### Orders

#### `GET /api/orders?org_id=xxx`

List orders for an organization.

**Query Parameters:**

- `org_id` (string, required) - Organization ID

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "org-uuid",
      "patient": { "id": "...", "name": "..." },
      "provider": { "id": "...", "name": "..." },
      "modality": "MRI Brain",
      "cpt_codes": ["70551"],
      "icd10_codes": ["G89.29"],
      "clinic_notes_text": "Patient reports...",
      "created_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

---

#### `POST /api/orders`

Create a new order.

**Request Body:**

```json
{
  "org_id": "org-uuid",
  "patient_id": "patient-uuid",
  "provider_id": "provider-uuid",
  "modality": "MRI Brain",
  "cpt_codes": ["70551"],
  "icd10_codes": ["G89.29"],
  "clinic_notes_text": "Patient reports chronic headaches..."
}
```

**Response:** `201` with order object

---

#### `GET /api/orders/[id]`

Get single order with full details.

**Response:** Order object with patient and provider details

---

#### `PATCH /api/orders/[id]`

Update order fields.

**Request Body:**

```json
{
  "modality": "CT Head",
  "cpt_codes": ["70450"],
  "clinic_notes_text": "Updated notes..."
}
```

**Response:** Updated order object

---

#### `DELETE /api/orders/[id]`

Delete order (fails if PA requests exist).

**Response:**

```json
{
  "success": true,
  "data": { "id": "uuid", "deleted": true }
}
```

---

### PA Requests

#### `GET /api/pa-requests?org_id=xxx&status=xxx&patient_id=xxx`

List PA requests with optional filters.

**Query Parameters:**

- `org_id` (string, required) - Organization ID
- `status` (string, optional) - Filter by status: `draft`, `submitted`, `pending_info`, `approved`, `denied`, `appealed`
- `patient_id` (string, optional) - Filter by patient

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "org-uuid",
      "order": {
        "id": "...",
        "patient": { "name": "..." },
        "provider": { "name": "..." },
        "modality": "MRI Brain"
      },
      "payer": { "id": "...", "name": "Blue Cross" },
      "priority": "standard",
      "status": "draft",
      "created_by": "user-uuid",
      "submitted_at": null,
      "created_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

---

#### `POST /api/pa-requests`

Create new PA request.

**Request Body:**

```json
{
  "org_id": "org-uuid",
  "order_id": "order-uuid",
  "payer_id": "payer-uuid",
  "priority": "standard"
}
```

**Response:** `201` with PA request object

---

#### `GET /api/pa-requests/[id]`

Get single PA request with full details (checklist, summaries, status events).

**Response:** PA request object with nested data

---

#### `PATCH /api/pa-requests/[id]`

Update PA request.

**Request Body:**

```json
{
  "status": "submitted",
  "note": "PA submitted to payer portal"
}
```

OR

```json
{
  "priority": "urgent"
}
```

**Response:** Updated PA request object

---

#### `POST /api/pa-requests/[id]/submit`

Submit PA request (draft → submitted).

**Validations:**

- PA must be in `draft` status
- All required checklist items must be `attached` or `waived`
- Medical necessity summary must exist

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "2025-10-17T12:00:00Z"
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Cannot submit: 2 required checklist item(s) incomplete",
  "incomplete_items": [
    { "id": "item-1", "name": "Prior imaging reports" },
    { "id": "item-2", "name": "Clinical notes" }
  ]
}
```

---

#### `DELETE /api/pa-requests/[id]`

Delete PA request (cascade deletes related data).

**Response:**

```json
{
  "success": true,
  "data": { "id": "uuid", "deleted": true }
}
```

---

### OCR Processing

#### `POST /api/ocr/process`

Process OCR for an attachment.

**Request Body:**

```json
{
  "attachment_id": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "attachment_id": "uuid",
    "ocr_text": "Extracted text from document...",
    "confidence": 0.95,
    "adapter": "mock"
  }
}
```

**Note:** If attachment already has `ocr_text`, returns immediately with `already_processed: true`.

---

### Background Jobs

#### `POST /api/jobs/ocr-batch`

Background job to process pending OCR tasks (called by Vercel Cron).

**Auth:** Bearer token via `CRON_SECRET` env var

**Request Header:**

```
Authorization: Bearer <CRON_SECRET>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "processed": 5,
    "successful": 4,
    "failed": 1,
    "results": [
      { "id": "att-1", "success": true, "confidence": 0.92 },
      { "id": "att-2", "success": false, "error": "Download failed" }
    ]
  }
}
```

**Cron Schedule:** Runs every 5 minutes (configured in `vercel.json`)

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**403 Forbidden (RLS violation):**

```json
{
  "success": false,
  "error": "User does not have access to this organization"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "error": "PA request not found"
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "error": "Database error: [details]"
}
```

---

## Testing

API endpoint tests are located in `apps/web/tests/api/`:

- `orders.test.ts` - Order management
- `pa-requests.test.ts` - PA request workflow
- `attachments.test.ts` - File upload/download

Run tests:

```bash
npm run test -- apps/web/tests/api
```

---

## Security

1. **Authentication:** All routes check for valid Supabase session
2. **RLS Enforcement:** Database queries automatically filter by user's org membership
3. **Input Validation:** All inputs are validated before processing
4. **File Upload:** Size limits (50MB), type validation, SHA256 hash verification
5. **Background Jobs:** Protected by Bearer token authentication

---

## Future Enhancements

1. **Rate Limiting:** Implement request rate limits per user/org
2. **Webhooks:** Support webhook notifications for status changes
3. **Bulk Operations:** Batch create/update endpoints
4. **GraphQL:** Consider GraphQL API for complex queries
5. **API Versioning:** Implement `/api/v1/` prefix for future compatibility
