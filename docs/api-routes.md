# API Routes Documentation

**Last Updated:** 2025-10-24

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

### Providers

#### `GET /api/providers?org_id=xxx&q=search`

List providers for an organization with optional search.

**Query Parameters:**

- `org_id` (string, required) - Organization ID
- `q` (string, optional) - Search term (case-insensitive, matches name)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "org-uuid",
      "name": "Dr. Sarah Johnson",
      "npi": "1234567890",
      "specialty": "Radiology",
      "location": "Building A, Suite 200",
      "created_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

---

#### `POST /api/providers`

Create a new provider.

**Request Body:**

```json
{
  "org_id": "org-uuid",
  "name": "Dr. Michael Chen",
  "npi": "0987654321",
  "specialty": "Orthopedic Surgery",
  "location": "Building B, Suite 300"
}
```

**Validation (via `validateProviderCreate`):**

- `name` (string, required, 1-200 chars)
- `npi` (string, optional, exactly 10 digits)
- `specialty` (string, optional, max 100 chars)
- `location` (string, optional, max 200 chars)

**Response:** `201` with provider object

---

#### `PATCH /api/providers`

Update existing provider.

**Request Body:**

```json
{
  "id": "provider-uuid",
  "org_id": "org-uuid",
  "name": "Dr. Michael Chen, MD",
  "specialty": "Sports Medicine"
}
```

**Validation (via `validateProviderUpdate`):**

- `id` (string, required)
- Other fields same as create (all optional except `id`)

**Response:** Updated provider object

---

#### `DELETE /api/providers?id=xxx`

Delete provider.

**Query Parameters:**

- `id` (string, required) - Provider ID

**Response:**

```json
{
  "success": true,
  "data": { "id": "uuid" }
}
```

**Note:** Fails if provider has associated orders.

---

### Patients

#### `GET /api/patients?org_id=xxx`

List patients for an organization.

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
      "name": "John Anderson",
      "mrn": "MRN001234",
      "dob": "1975-03-15",
      "sex": "M",
      "phone": "555-0101",
      "address": "123 Main St, Anytown, USA",
      "created_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

---

#### `POST /api/patients`

Create a new patient.

**Request Body:**

```json
{
  "org_id": "org-uuid",
  "name": "Maria Garcia",
  "mrn": "MRN001235",
  "dob": "1982-07-22",
  "sex": "F",
  "phone": "555-0102",
  "address": "456 Oak Ave, Anytown, USA"
}
```

**Validation (via `validatePatientCreate`):**

- `name` (string, required, 1-200 chars)
- `mrn` (string, optional, max 50 chars)
- `dob` (date string, optional, YYYY-MM-DD format)
- `sex` (string, optional, "M" | "F" | "X")
- `phone` (string, optional, max 20 chars)
- `address` (string, optional, max 500 chars)

**Response:** `201` with patient object

---

### Payers

#### `GET /api/payers?q=search`

List all payers (shared reference data).

**Query Parameters:**

- `q` (string, optional) - Search term (case-insensitive, matches name)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "BlueCross BlueShield",
      "portal_url": "https://www.bcbs.com",
      "contact": "provider-services@bcbs.com",
      "policy_links": ["https://policies.bcbs.com/imaging"],
      "created_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

**Note:** Uses `supabaseAdmin` (bypasses RLS). All authenticated users can view payers.

---

#### `POST /api/payers`

Create new payer (admin only).

**Request Body:**

```json
{
  "name": "Aetna",
  "portal_url": "https://www.aetna.com",
  "contact": "provider-services@aetna.com",
  "policy_links": ["https://policies.aetna.com/prior-auth"]
}
```

**Response:** `201` with payer object

**Auth:** Requires user to be admin role.

---

#### `PATCH /api/payers`

Update payer (admin only).

**Request Body:**

```json
{
  "id": "payer-uuid",
  "name": "Aetna Health",
  "contact": "pa-team@aetna.com"
}
```

**Response:** Updated payer object

---

#### `DELETE /api/payers?id=xxx`

Delete payer (admin only).

**Query Parameters:**

- `id` (string, required) - Payer ID

**Response:**

```json
{
  "success": true,
  "data": { "id": "uuid", "deleted_by": "user-uuid" }
}
```

---

### Organization

#### `GET /api/org?org_id=xxx`

Get organization profile.

**Query Parameters:**

- `org_id` (string, required) - Organization ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Anytown Medical Center",
    "domain": "anytown-medical",
    "settings": {
      "default_priority": "standard",
      "auto_generate_checklist": true
    },
    "created_at": "2025-10-17T12:00:00Z"
  }
}
```

---

#### `PATCH /api/org`

Update organization profile.

**Request Body:**

```json
{
  "org_id": "org-uuid",
  "name": "Anytown Medical Center - Downtown",
  "settings": {
    "default_priority": "urgent"
  }
}
```

**Response:** Updated organization object

---

### Metrics & Analytics

#### `GET /api/metrics?org_id=xxx&time_range=30d`

Get dashboard metrics and analytics.

**Query Parameters:**

- `org_id` (string, required) - Organization ID
- `time_range` (string, optional) - Time range: `7d`, `30d`, `90d`, `1y` (default: `30d`)

**Response:**

```json
{
  "success": true,
  "data": {
    "overall": {
      "totalRequests": 45,
      "approvalRate": 87.5,
      "avgTurnaroundDays": 2.3,
      "urgentRequests": 8
    },
    "byStatus": {
      "draft": 5,
      "submitted": 12,
      "approved": 21,
      "denied": 3,
      "pending_info": 4
    },
    "payerCounts": {
      "payer-uuid-1": 15,
      "payer-uuid-2": 20,
      "payer-uuid-3": 10
    },
    "trends": [
      { "month": "Jul", "requests": 10, "approvalRate": 80.0 },
      { "month": "Aug", "requests": 12, "approvalRate": 85.0 },
      { "month": "Sep", "requests": 15, "approvalRate": 90.0 },
      { "month": "Oct", "requests": 8, "approvalRate": 87.5 }
    ]
  }
}
```

**Calculations:**

- `approvalRate` - (approved / (approved + denied)) \* 100
- `avgTurnaroundDays` - Average days from created → submitted
- `trends` - Last 4 months of data

---

### Audit Log

#### `GET /api/audit?org_id=xxx&limit=100&offset=0`

Get paginated audit log entries with filters.

**Query Parameters:**

- `org_id` (string, required) - Organization ID
- `user_id` (string, optional) - Filter by user
- `action` (string, optional) - Filter by action type: `create`, `update`, `delete`, `submit`, `approve`, `deny`
- `subject` (string, optional) - Filter by subject type: `pa_request`, `attachment`, `order`, `patient`, `provider`
- `start_date` (ISO string, optional) - Filter by date range start
- `end_date` (ISO string, optional) - Filter by date range end
- `limit` (number, optional) - Number of records (default: 100, max: 1000)
- `offset` (number, optional) - Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "org-uuid",
      "user_id": "user-uuid",
      "action": "create",
      "subject": "pa_request",
      "subject_id": "pa-uuid",
      "details": {
        "payer": "BlueCross",
        "priority": "standard"
      },
      "at": "2025-10-17T12:00:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 543
  }
}
```

---

### Member Tour Status

#### `GET /api/member/tour-status`

Get current user's onboarding tour status.

**Response:**

```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "tour_completed": false,
    "completed_at": null
  }
}
```

---

#### `POST /api/member/tour-status`

Mark onboarding tour as complete.

**Response:**

```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "tour_completed": true,
    "completed_at": "2025-10-17T12:00:00Z"
  }
}
```

---

#### `PATCH /api/member/tour-status`

Update tour status (partial update).

**Response:** Updated status object

---

#### `PUT /api/member/tour-status`

Replace tour status (full update).

**Response:** Replaced status object

---

#### `DELETE /api/member/tour-status`

Clear tour status (reset to incomplete).

**Response:**

```json
{
  "success": true,
  "data": { "user_id": "user-uuid", "cleared": true }
}
```

---

### LLM Features

**Prerequisites:**

- `ENABLE_LLM=true` environment variable
- `CACHEGPT_API_KEY` configured

**Error Response (503) if disabled:**

```json
{
  "success": false,
  "error": "LLM features disabled. Set ENABLE_LLM=true and configure CACHEGPT_API_KEY."
}
```

---

#### `POST /api/llm/checklist`

Generate PA checklist items using AI.

**Request Body:**

```json
{
  "pa_request_id": "uuid"
}
```

**Process:**

1. Fetches PA request with order and payer details
2. Fetches relevant policy snippets for payer + CPT codes
3. Calls CacheGPT to generate checklist items
4. Inserts items into `pa_checklist_item` table

**Response:**

```json
{
  "success": true,
  "data": {
    "checklist_items": [
      {
        "id": "uuid",
        "pa_request_id": "pa-uuid",
        "name": "Prior imaging reports from last 12 months",
        "rationale": "Payer requires documentation of previous imaging (Policy Section 4.2)",
        "required_bool": true,
        "status": "pending",
        "created_at": "2025-10-17T12:00:00Z"
      }
    ],
    "llm_metadata": {
      "model": "claude-3-5-sonnet-20241022",
      "usage": {
        "input_tokens": 500,
        "output_tokens": 200
      }
    }
  }
}
```

**Note:** If checklist already exists, returns existing items without regenerating.

---

#### `POST /api/llm/medical-necessity`

Generate medical necessity summary using AI.

**Request Body:**

```json
{
  "pa_request_id": "uuid"
}
```

**Process:**

1. Fetches PA request with order, patient, and payer details
2. Fetches policy criteria for payer
3. Calls CacheGPT to generate medical necessity narrative
4. Inserts versioned summary into `pa_summary` table

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "id": "uuid",
      "pa_request_id": "pa-uuid",
      "medical_necessity_text": "The patient is a 58-year-old female...",
      "indications_text": "Clinical indications include...",
      "risk_benefit_text": "Risk/benefit analysis demonstrates...",
      "generated_by_model": "claude-3-5-sonnet-20241022",
      "version": 1,
      "created_at": "2025-10-17T12:00:00Z"
    },
    "llm_metadata": {
      "model": "claude-3-5-sonnet-20241022",
      "usage": {
        "input_tokens": 800,
        "output_tokens": 600
      }
    }
  }
}
```

**Versioning:** Each generation creates a new version. Previous versions are preserved.

---

### PDF Generation

**Uses:** `@greenlight/pdfkit` package for PDF creation.

---

#### `POST /api/pdf/cover-letter`

Generate PA cover letter PDF.

**Request Body:**

```json
{
  "pa_request_id": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "pdf_url": "https://storage.example.com/cover-letter.pdf",
    "filename": "PA_CoverLetter_2025-10-17.pdf",
    "size_bytes": 45632
  }
}
```

**PDF Contents:**

- PA request details
- Patient information
- Provider information
- Payer information
- Medical necessity summary
- Checklist of attached documents

---

#### `POST /api/pdf/approval-summary`

Generate approval summary PDF.

**Request Body:**

```json
{
  "pa_request_id": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "pdf_url": "https://storage.example.com/approval-summary.pdf",
    "filename": "PA_ApprovalSummary_2025-10-17.pdf",
    "size_bytes": 38912
  }
}
```

**PDF Contents:**

- Approval decision details
- Authorization number
- Coverage period
- Conditions/limitations

---

### Policy Management

**Prerequisites:**

- `ENABLE_POLICY_INGESTION=true` environment variable

---

#### `POST /api/policy/ingest`

Ingest policy document from URL.

**Request Body:**

```json
{
  "url": "https://payer.com/policies/imaging-2025.pdf",
  "payer_id": "uuid",
  "modality": "MRI Brain"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "policy_snippets": [
      {
        "id": "uuid",
        "payer_id": "payer-uuid",
        "modality": "MRI Brain",
        "cpt_code": "70553",
        "snippet_text": "Prior authorization required...",
        "source_url": "https://payer.com/policies/imaging-2025.pdf",
        "created_at": "2025-10-17T12:00:00Z"
      }
    ],
    "extracted_count": 5
  }
}
```

**Error Response (503) if disabled:**

```json
{
  "success": false,
  "error": "Policy ingestion disabled. Set ENABLE_POLICY_INGESTION=true."
}
```

---

### Authentication Helpers

#### `GET /api/auth/callback?code=xxx`

OAuth callback handler (Supabase Auth).

**Query Parameters:**

- `code` (string) - OAuth authorization code

**Response:** Redirects to `/dashboard` on success

---

#### `POST /api/auth/check-email`

Check if email exists in system.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "exists": true,
    "can_signin": true
  }
}
```

---

#### `POST /api/auth/logout`

Clear user session.

**Response:**

```json
{
  "success": true,
  "data": { "logged_out": true }
}
```

**Action:** Clears Supabase session cookies and redirects to `/`.

---

#### `POST /api/auth/provision`

Provision new user and organization.

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "org_name": "New Clinic"
}
```

**Process:**

1. Creates Supabase auth user
2. Creates organization record
3. Creates member record linking user to org (role: admin)

**Response:**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "org_id": "uuid",
    "member_id": "uuid"
  }
}
```

---

#### `POST /api/auth/set-session`

Set session cookies from tokens.

**Request Body:**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "v1.abc..."
}
```

**Response:**

```json
{
  "success": true,
  "data": { "session_set": true }
}
```

**Note:** Used after magic link authentication to establish session.

---

## Environment Variables

### Required (Core)

| Variable                        | Description                 | Example                   |
| ------------------------------- | --------------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL        | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client)  | `eyJhbGc...`              |
| `NEXT_SUPABASE_URL`             | Supabase URL (server)       | `https://xxx.supabase.co` |
| `NEXT_SUPABASE_ANON_KEY`        | Supabase anon key (server)  | `eyJhbGc...`              |
| `NEXT_SUPABASE_ROLE_KEY`        | Supabase service role key   | `eyJhbGc...`              |
| `NEXT_SUPABASE_JWT_SECRET`      | JWT secret for verification | `base64-secret`           |

### Feature Flags

| Variable                  | Description             | Default | Required For         |
| ------------------------- | ----------------------- | ------- | -------------------- |
| `ENABLE_LLM`              | Enable AI features      | `false` | `/api/llm/*`         |
| `CACHEGPT_API_KEY`        | CacheGPT API key        | -       | `/api/llm/*`         |
| `ENABLE_OCR`              | Enable OCR processing   | `false` | `/api/ocr/process`   |
| `ENABLE_POLICY_INGESTION` | Enable policy ingestion | `false` | `/api/policy/ingest` |

### Background Jobs

| Variable      | Description          | Required For          |
| ------------- | -------------------- | --------------------- |
| `CRON_SECRET` | Secret for cron auth | `/api/jobs/ocr-batch` |

### Optional

| Variable                  | Description             | Default |
| ------------------------- | ----------------------- | ------- |
| `NEXT_PUBLIC_DEMO_MODE`   | Enable demo mode banner | `false` |
| `NEXT_PUBLIC_SENTRY_DSN`  | Sentry error tracking   | -       |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics       | -       |

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

**Existing Tests:**

- `tour-status.test.ts` - Member onboarding tour status endpoints
- `validation.test.ts` - Input validation helpers

**Test Coverage Needed:**

- `providers.test.ts` - Provider CRUD operations
- `patients.test.ts` - Patient CRUD operations
- `payers.test.ts` - Payer management (admin)
- `orders.test.ts` - Order management
- `pa-requests.test.ts` - PA request workflow
- `attachments.test.ts` - File upload/download
- `metrics.test.ts` - Dashboard analytics
- `audit.test.ts` - Audit log pagination/filtering
- `llm.test.ts` - LLM feature endpoints (mocked)
- `pdf.test.ts` - PDF generation endpoints
- `auth.test.ts` - Authentication helpers

Run tests:

```bash
npm run test
```

Run specific test suite:

```bash
npm run test -- apps/web/tests/api/tour-status.test.ts
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
