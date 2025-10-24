# Database Schema Documentation

**Last Updated:** 2025-10-24
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

Links Supabase auth users to organizations with roles and membership status

| Column       | Type        | Description                         |
| ------------ | ----------- | ----------------------------------- |
| `id`         | UUID        | Primary key                         |
| `org_id`     | UUID        | FK → `org.id`                       |
| `user_id`    | UUID        | FK → `auth.users` (Supabase)        |
| `role`       | TEXT        | `admin` \| `staff` \| `referrer`    |
| `status`     | TEXT        | `pending` \| `active` \| `rejected` |
| `created_at` | TIMESTAMPTZ | Creation timestamp                  |

**Unique Constraint**: `(org_id, user_id)`
**RLS**: Users can view members of orgs they belong to; admins can modify

**Membership Status Workflow**:

- `pending`: User has signed up and requested to join an existing organization. Cannot access org data until approved.
- `active`: User has been approved by an admin (or is the creator of a new organization). Can access org data.
- `rejected`: User's membership request was denied by an admin. Cannot access org data.

**Notes**:

- When a user creates a new organization, they are automatically assigned `admin` role with `active` status
- When a user joins an existing organization, they are assigned `staff` role (or requested role if not admin) with `pending` status
- All API endpoints check for `active` status before granting access to organization resources
- Admins can approve or reject pending memberships via `/api/admin/pending-members`

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

## Role-Based Access Control (RBAC)

### Overview

Greenlight PA implements a three-tier role-based access control system enforced at both the database (RLS) and application layers. All users are assigned a role when they join an organization through the `member` table.

### Roles

| Role       | Description                                         | Typical User                     |
| ---------- | --------------------------------------------------- | -------------------------------- |
| `admin`    | Full access to all organization data and settings   | Practice managers, clinic admins |
| `staff`    | Read/write access to clinical data, no admin access | PA coordinators, case managers   |
| `referrer` | Limited read access for external users              | Referring physicians (future)    |

### Role Assignment

1. **First User**: When a new organization is provisioned, the first user is automatically assigned the `admin` role
2. **Subsequent Users**: New users default to `staff` role unless explicitly set during signup
3. **Role Changes**: Only admins can modify roles for other users (via future admin UI)

### Permission Matrix

| Resource             | Admin | Staff | Referrer |
| -------------------- | ----- | ----- | -------- |
| **Payers**           |       |       |          |
| - View               | ✓     | ✓     | ✓        |
| - Create             | ✓     | ✗     | ✗        |
| - Update             | ✓     | ✗     | ✗        |
| - Delete             | ✓     | ✗     | ✗        |
| **Patients**         |       |       |          |
| - View               | ✓     | ✓     | Limited  |
| - Create/Update      | ✓     | ✓     | ✗        |
| - Delete             | ✓     | ✓     | ✗        |
| **Orders & PAs**     |       |       |          |
| - View               | ✓     | ✓     | Own only |
| - Create/Update      | ✓     | ✓     | ✗        |
| - Delete             | ✓     | ✓     | ✗        |
| - Submit PA          | ✓     | ✓     | ✗        |
| **Org Settings**     |       |       |          |
| - View               | ✓     | ✓     | ✗        |
| - Update             | ✓     | ✗     | ✗        |
| **Metrics/Reports**  |       |       |          |
| - View               | ✓     | ✓     | ✗        |
| **Audit Logs**       |       |       |          |
| - View               | ✓     | ✓     | ✗        |
| **Policy Ingestion** |       |       |          |
| - Trigger            | ✓     | ✗     | ✗        |

### API-Level Enforcement

The application enforces RBAC through middleware functions in `apps/web/app/api/_lib/org.ts`:

1. **`requireUser(request)`** - Authenticates user, throws 401 if not logged in
2. **`getOrgContext(request, orgId)`** - Resolves user's organization and role (checks for `active` status)
3. **`requireOrgAdmin(request, orgId)`** - Ensures user has admin role and `active` status, throws 403 otherwise

All middleware functions check that the user has `status = 'active'` before granting access. Pending or rejected memberships result in 403 errors with appropriate messages.

**Example Usage:**

```typescript
// Admin-only endpoint
export async function POST(request: NextRequest) {
  const { orgId } = await requireOrgAdmin(request, null);
  // Only admins reach this point
}

// Staff-accessible endpoint
export async function GET(request: NextRequest) {
  const { orgId, role } = await getOrgContext(request, null);
  // All roles reach this point, can branch on role if needed
}
```

### Database-Level Enforcement

Row Level Security policies use helper functions to enforce org membership:

```sql
-- Helper: get_user_org_ids (only active memberships)
CREATE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(org_id)
  FROM member
  WHERE user_id = user_uuid
    AND status = 'active';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: is_org_admin (only active admin memberships)
CREATE FUNCTION is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM member
    WHERE user_id = user_uuid
      AND org_id = org_uuid
      AND role = 'admin'
      AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

**RLS Policy Examples:**

```sql
-- Payers: All authenticated users can view
CREATE POLICY "payer_select_policy" ON payer
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Payers: Only admins can insert/update/delete
CREATE POLICY "payer_modify_policy" ON payer
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM member
      WHERE member.user_id = auth.uid()
        AND member.role = 'admin'
    )
  );

-- Patients: Scoped to user's organizations
CREATE POLICY "patient_policy" ON patient
  FOR ALL
  USING (org_id = ANY(get_user_org_ids(auth.uid())));
```

### UI-Level Enforcement

The dashboard navigation conditionally shows admin-only features:

- **Admin Tab**: Hidden for non-admin users (see `apps/web/app/dashboard/layout.tsx`)
- **Future**: Admin-only buttons/forms will be disabled or hidden based on user role

### Signup and Provisioning Flow

The signup process has two paths: creating a new organization or joining an existing one.

#### New Organization Creation

1. User signs up via `/signup` (Step 1: credentials)
2. User selects "Create New Organization" (Step 2)
3. `POST /api/auth/provision` with `createNew: true`:
   - Creates new `org` record
   - Creates `member` record with `role: admin`, `status: active`
   - User gains immediate access to their new organization

#### Joining Existing Organization

1. User signs up via `/signup` (Step 1: credentials)
2. User browses and selects an existing organization via `GET /api/organizations/public` (Step 2)
3. `POST /api/auth/provision` with `orgId`:
   - Creates `member` record with `role: staff` (or requested role if not admin), `status: pending`
   - Returns pending status message
4. User cannot access dashboard until approved
5. Organization admin reviews pending request via `/dashboard/admin` → "Pending Members" tab
6. Admin approves/rejects via `PATCH /api/admin/pending-members`:
   - **Approve**: Sets `status: active`, user can now access org
   - **Reject**: Sets `status: rejected`, user cannot access org
7. On next login attempt, status check determines if user can access dashboard

**Security Considerations**:

- Self-signup to existing orgs defaults to `staff` role and `pending` status
- Users cannot self-escalate to `admin` role for existing organizations
- All API endpoints check for `active` membership status before granting access
- Login flow includes status check to prevent pending users from accessing dashboard

---

## Security Notes

1. **Never bypass RLS in client code** - Always use the standard `supabase` client
2. **Service role key** - Only use `supabaseAdmin` for:
   - Background jobs
   - Admin operations that require bypassing RLS
   - Audit log writes
   - Creating/deleting payers (admin-only feature)
3. **PHI Handling** - In production, enable column-level encryption for sensitive fields
4. **BAA Required** - Ensure Business Associate Agreement with Supabase before processing real PHI
5. **Role Validation** - Always use `requireOrgAdmin()` for admin-only API endpoints

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
