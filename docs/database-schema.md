# Database Schema Documentation

**Last Updated:** 2025-10-17
**Database:** PostgreSQL 15+ (Supabase)
**Security:** Row Level Security (RLS) enabled on all tables

---

## Overview

The Greenlight PA database is designed as a multi-tenant system with organization-level data isolation enforced through Row Level Security (RLS). All tables are scoped to organizations (`org_id`) except for shared reference data (payers, policy snippets).

### Key Principles

1. **Multi-Tenancy**: All clinical data is scoped to organizations
2. **RLS First**: Security enforced at database level, not just application
3. **Audit Trail**: All significant actions logged to `audit_log`
4. **No PHI in Dev**: Demo data uses de-identified information only
5. **Versioning**: Medical necessity summaries are versioned

---

## Entity Relationship Diagram

```
org (1) ──< member (N)
  │
  ├──< patient (N) ──< coverage (N) ──> payer (1)
  ├──< provider (N)
  ├──< order (N) ───> patient (1)
  │                └─> provider (1)
  │
  └──< pa_request (N) ───> order (1)
       │                  ├─> payer (1)
       │
       ├──< pa_checklist_item (N) ──> attachment (0..1)
       ├──< pa_summary (N)  [versioned]
       └──< status_event (N)  [immutable audit trail]

[Shared Reference Data]
payer (1) ──< policy_snippet (N)

[Audit]
audit_log  [comprehensive audit trail]
```

---

## Tables

### Organizations & Users

#### `org`

Healthcare organizations (clinics, practices)

| Column       | Type        | Description                  |
| ------------ | ----------- | ---------------------------- |
| `id`         | UUID        | Primary key                  |
| `name`       | TEXT        | Organization name            |
| `npi`        | TEXT        | National Provider Identifier |
| `address`    | TEXT        | Physical address             |
| `created_at` | TIMESTAMPTZ | Creation timestamp           |

**RLS**: Users can only view orgs they are members of

---

#### `member`

Links Supabase auth users to organizations with roles

| Column       | Type        | Description                      |
| ------------ | ----------- | -------------------------------- |
| `id`         | UUID        | Primary key                      |
| `org_id`     | UUID        | FK → `org.id`                    |
| `user_id`    | UUID        | FK → `auth.users` (Supabase)     |
| `role`       | TEXT        | `admin` \| `staff` \| `referrer` |
| `created_at` | TIMESTAMPTZ | Creation timestamp               |

**Unique Constraint**: `(org_id, user_id)`
**RLS**: Users can view members of orgs they belong to; admins can modify

---

### Clinical Entities

#### `patient`

Patient demographics (de-identified in demo mode)

| Column       | Type        | Description                          |
| ------------ | ----------- | ------------------------------------ |
| `id`         | UUID        | Primary key                          |
| `org_id`     | UUID        | FK → `org.id`                        |
| `mrn`        | TEXT        | Medical record number                |
| `name`       | TEXT        | Patient name (de-identified in demo) |
| `dob`        | DATE        | Date of birth                        |
| `sex`        | TEXT        | Sex                                  |
| `phone`      | TEXT        | Phone number                         |
| `address`    | TEXT        | Address                              |
| `created_at` | TIMESTAMPTZ | Creation timestamp                   |

**RLS**: Scoped to org membership

---

#### `payer`

Insurance payers (shared reference data)

| Column         | Type        | Description                   |
| -------------- | ----------- | ----------------------------- |
| `id`           | UUID        | Primary key                   |
| `name`         | TEXT        | Payer name                    |
| `portal_url`   | TEXT        | Payer portal URL              |
| `contact`      | TEXT        | Contact information           |
| `policy_links` | TEXT[]      | Array of policy document URLs |
| `created_at`   | TIMESTAMPTZ | Creation timestamp            |

**RLS**: All authenticated users can view; only admins can modify

---

#### `coverage`

Patient insurance coverage information

| Column                   | Type        | Description              |
| ------------------------ | ----------- | ------------------------ |
| `id`                     | UUID        | Primary key              |
| `org_id`                 | UUID        | FK → `org.id`            |
| `patient_id`             | UUID        | FK → `patient.id`        |
| `payer_id`               | UUID        | FK → `payer.id`          |
| `plan_name`              | TEXT        | Insurance plan name      |
| `group_no`               | TEXT        | Group number             |
| `member_id`              | TEXT        | Member ID                |
| `eligibility_checked_at` | TIMESTAMPTZ | Last eligibility check   |
| `raw_json`               | JSONB       | Raw eligibility response |
| `created_at`             | TIMESTAMPTZ | Creation timestamp       |

**RLS**: Scoped to org membership

---

#### `provider`

Ordering providers (physicians)

| Column       | Type        | Description                  |
| ------------ | ----------- | ---------------------------- |
| `id`         | UUID        | Primary key                  |
| `org_id`     | UUID        | FK → `org.id`                |
| `npi`        | TEXT        | National Provider Identifier |
| `name`       | TEXT        | Provider name                |
| `specialty`  | TEXT        | Medical specialty            |
| `location`   | TEXT        | Location/site                |
| `created_at` | TIMESTAMPTZ | Creation timestamp           |

**RLS**: Scoped to org membership

---

#### `order`

Clinical orders requiring prior authorization

| Column              | Type        | Description                  |
| ------------------- | ----------- | ---------------------------- |
| `id`                | UUID        | Primary key                  |
| `org_id`            | UUID        | FK → `org.id`                |
| `patient_id`        | UUID        | FK → `patient.id`            |
| `provider_id`       | UUID        | FK → `provider.id`           |
| `modality`          | TEXT        | Procedure/imaging modality   |
| `cpt_codes`         | TEXT[]      | CPT codes array              |
| `icd10_codes`       | TEXT[]      | ICD-10 diagnosis codes array |
| `clinic_notes_text` | TEXT        | Clinical notes/indication    |
| `created_at`        | TIMESTAMPTZ | Creation timestamp           |

**RLS**: Scoped to org membership

---

### Prior Authorization Workflow

#### `pa_request`

Main PA workflow entity

| Column         | Type        | Description                      |
| -------------- | ----------- | -------------------------------- |
| `id`           | UUID        | Primary key                      |
| `org_id`       | UUID        | FK → `org.id`                    |
| `order_id`     | UUID        | FK → `order.id`                  |
| `payer_id`     | UUID        | FK → `payer.id`                  |
| `priority`     | TEXT        | `standard` \| `urgent`           |
| `status`       | pa_status   | Workflow status (see enum below) |
| `created_by`   | UUID        | FK → `auth.users`                |
| `submitted_at` | TIMESTAMPTZ | Submission timestamp             |
| `created_at`   | TIMESTAMPTZ | Creation timestamp               |

**Enum `pa_status`**: `draft` \| `submitted` \| `pending_info` \| `approved` \| `denied` \| `appealed`

**RLS**: Scoped to org membership

---

#### `pa_checklist_item`

Payer-specific requirements checklist

| Column                   | Type            | Description                         |
| ------------------------ | --------------- | ----------------------------------- |
| `id`                     | UUID            | Primary key                         |
| `pa_request_id`          | UUID            | FK → `pa_request.id`                |
| `name`                   | TEXT            | Requirement name                    |
| `rationale`              | TEXT            | Why it's required (policy ref)      |
| `required_bool`          | BOOLEAN         | Is this item required?              |
| `status`                 | evidence_status | `pending` \| `attached` \| `waived` |
| `evidence_attachment_id` | UUID            | FK → `attachment.id`                |
| `created_at`             | TIMESTAMPTZ     | Creation timestamp                  |

**RLS**: Accessible if user has access to parent `pa_request`

---

#### `pa_summary`

Medical necessity narrative (versioned)

| Column                   | Type        | Description                  |
| ------------------------ | ----------- | ---------------------------- |
| `id`                     | UUID        | Primary key                  |
| `pa_request_id`          | UUID        | FK → `pa_request.id`         |
| `medical_necessity_text` | TEXT        | Main narrative               |
| `indications_text`       | TEXT        | Clinical indications         |
| `risk_benefit_text`      | TEXT        | Risk/benefit analysis        |
| `generated_by_model`     | TEXT        | LLM model used (if any)      |
| `version`                | INT         | Version number (starts at 1) |
| `created_at`             | TIMESTAMPTZ | Creation timestamp           |

**RLS**: Accessible if user has access to parent `pa_request`

---

#### `attachment`

Uploaded documents and evidence

| Column         | Type            | Description                    |
| -------------- | --------------- | ------------------------------ |
| `id`           | UUID            | Primary key                    |
| `org_id`       | UUID            | FK → `org.id`                  |
| `storage_path` | TEXT            | Supabase Storage path          |
| `type`         | attachment_type | Document type (see enum below) |
| `ocr_text`     | TEXT            | Extracted text via OCR         |
| `sha256`       | TEXT            | File hash for integrity        |
| `uploaded_by`  | UUID            | FK → `auth.users`              |
| `created_at`   | TIMESTAMPTZ     | Creation timestamp             |

**Enum `attachment_type`**: `order` \| `imaging` \| `lab` \| `notes` \| `payer_form` \| `appeal` \| `other`

**RLS**: Scoped to org membership

---

#### `status_event`

PA status change history (immutable audit trail)

| Column          | Type        | Description          |
| --------------- | ----------- | -------------------- |
| `id`            | UUID        | Primary key          |
| `pa_request_id` | UUID        | FK → `pa_request.id` |
| `status`        | pa_status   | New status           |
| `note`          | TEXT        | Optional note/reason |
| `actor`         | UUID        | FK → `auth.users`    |
| `at`            | TIMESTAMPTZ | Event timestamp      |

**RLS**: Accessible if user has access to parent `pa_request`
**Immutable**: No UPDATE or DELETE policies

---

### Policy Management

#### `policy_snippet`

Payer policy knowledge base

| Column         | Type        | Description                |
| -------------- | ----------- | -------------------------- |
| `id`           | UUID        | Primary key                |
| `payer_id`     | UUID        | FK → `payer.id`            |
| `modality`     | TEXT        | Procedure/imaging modality |
| `cpt_code`     | TEXT        | Associated CPT code        |
| `snippet_text` | TEXT        | Policy excerpt             |
| `source_url`   | TEXT        | Source document URL        |
| `created_at`   | TIMESTAMPTZ | Creation timestamp         |

**RLS**: All authenticated users can view; only admins can modify

**Future**: Add `embedding vector(1536)` for semantic search

---

### Audit & Compliance

#### `audit_log`

Comprehensive audit trail

| Column       | Type        | Description                                    |
| ------------ | ----------- | ---------------------------------------------- |
| `id`         | UUID        | Primary key                                    |
| `org_id`     | UUID        | Org context (nullable)                         |
| `user_id`    | UUID        | Actor (FK → `auth.users`)                      |
| `action`     | TEXT        | Action verb (CREATE, UPDATE, DELETE, etc.)     |
| `subject`    | TEXT        | Entity type (patient, order, pa_request, etc.) |
| `subject_id` | UUID        | Entity ID                                      |
| `meta_json`  | JSONB       | Additional metadata                            |
| `at`         | TIMESTAMPTZ | Event timestamp                                |

**RLS**: Users can view logs for their org; typically inserted via service role

---

## Helper Functions

### `get_user_org_ids(user_uuid UUID)`

Returns set of org IDs the user is a member of

```sql
SELECT * FROM get_user_org_ids('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
-- Returns: {'11111111-1111-1111-1111-111111111111', ...}
```

---

### `is_org_admin(user_uuid UUID, org_uuid UUID)`

Checks if user is admin of the specified org

```sql
SELECT is_org_admin(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111'
);
-- Returns: true or false
```

---

### `audit_action(...)`

Creates audit log entry (typically called from triggers or app code)

```sql
SELECT audit_action(
  p_org_id := '11111111-1111-1111-1111-111111111111',
  p_user_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  p_action := 'CREATE',
  p_subject := 'patient',
  p_subject_id := '44444444-4444-4444-4444-444444444441',
  p_meta_json := '{"method": "web_form"}'::jsonb
);
```

---

## Migrations

### Applying Migrations

```bash
# Local Supabase
supabase db push

# Or via psql
psql -h <host> -U postgres -d postgres -f packages/db/migrations/20251017000001_initial_schema.sql
psql -h <host> -U postgres -d postgres -f packages/db/migrations/20251017000002_rls_policies.sql
```

### Seeding Demo Data

```bash
psql -h <host> -U postgres -d postgres -f packages/db/seeds/20251017_demo_data.sql
```

---

## TypeScript Usage

### Import

```typescript
import {
  supabase,
  getCurrentUserOrgId,
  getPatientsByOrg,
} from "@greenlight/db";
```

### Query Examples

```typescript
// Get current user's org
const orgId = await getCurrentUserOrgId();

// Get patients (RLS-protected)
const result = await getPatientsByOrg(orgId);
if (result.success) {
  console.log(result.data);
}

// Create PA request
const paResult = await createPARequest({
  org_id: orgId,
  order_id: "...",
  payer_id: "...",
  priority: "standard",
  status: "draft",
});
```

---

## Security Notes

1. **Never bypass RLS in client code** - Always use the standard `supabase` client
2. **Service role key** - Only use `supabaseAdmin` for:
   - Background jobs
   - Admin operations
   - Audit log writes
3. **PHI Handling** - In production, enable column-level encryption for sensitive fields
4. **BAA Required** - Ensure Business Associate Agreement with Supabase before processing real PHI

---

## Performance Indexes

All foreign keys and frequently queried columns are indexed:

- `org_id` on all org-scoped tables
- `patient_id`, `provider_id`, `payer_id` on related tables
- `status` on `pa_request`
- `at` DESC on `audit_log` and `status_event`

---

## Backup & Recovery

- **Point-in-Time Recovery (PITR)**: Supabase Pro includes 7-day PITR
- **Daily Backups**: Automated via Supabase
- **Export Script**: See `docs/runbooks/backup.md` (to be created)

---

## Future Enhancements

1. **Vector Search**: Add `pgvector` for semantic policy search
2. **Triggers**: Auto-create `status_event` on `pa_request` status changes
3. **Soft Deletes**: Add `deleted_at` columns for compliance
4. **Encryption**: Column-level encryption for PHI fields
5. **Read Replicas**: For reporting and analytics
