# @greenlight/db

Database package for Greenlight PA - PostgreSQL schema, migrations, TypeScript types, and query SDK.

## Features

- PostgreSQL schema with full Row Level Security (RLS)
- Multi-tenant data isolation at database level
- TypeScript types generated from schema
- Query SDK with built-in RLS guards
- Migration scripts for schema versioning
- Demo data seeds (no PHI)

## Setup

### Prerequisites

- Supabase account or local Supabase instance
- PostgreSQL 15+
- Node.js 20+

### Installation

```bash
npm install
```

### Environment Variables

```bash
# .env.local
NEXT_SUPABASE_URL=https://your-project.supabase.co
NEXT_SUPABASE_ANON_KEY=your-anon-key
NEXT_SUPABASE_ROLE_KEY=your-service-role-key
NEXT_SUPABASE_JWT_SECRET=your-jwt-secret
```

## Usage

### Import

```typescript
import {
  supabase,
  getCurrentUserOrgId,
  getPatientsByOrg,
  createPARequest,
} from "@greenlight/db";
```

### Querying Data

```typescript
// Get current user's organization
const orgId = await getCurrentUserOrgId();

// Get patients (automatically RLS-protected)
const result = await getPatientsByOrg(orgId);
if (result.success) {
  console.log("Patients:", result.data);
} else {
  console.error("Error:", result.error);
}

// Create a PA request
const paResult = await createPARequest({
  org_id: orgId,
  order_id: "order-uuid",
  payer_id: "payer-uuid",
  priority: "standard",
  status: "draft",
});
```

### Direct Supabase Client

```typescript
import { supabase } from "@greenlight/db";

// RLS is automatically enforced
const { data, error } = await supabase
  .from("patient")
  .select("*")
  .eq("org_id", orgId);
```

## Migrations

### Apply Migrations

#### Local Supabase

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Or manually
psql -h localhost -p 54322 -U postgres -d postgres \
  -f migrations/20251017000001_initial_schema.sql

psql -h localhost -p 54322 -U postgres -d postgres \
  -f migrations/20251017000002_rls_policies.sql
```

#### Production Supabase

```bash
# Using Supabase CLI
supabase db push --linked

# Or via Dashboard
# Go to SQL Editor → paste migration → run
```

### Seed Demo Data

```bash
psql -h localhost -p 54322 -U postgres -d postgres \
  -f seeds/20251017_demo_data.sql
```

## Generate Types

After applying migrations, regenerate TypeScript types:

```bash
npm run gen:types
```

This runs:

```bash
supabase gen types typescript --local > types/database.ts
```

## Testing

### Unit Tests

```bash
npm run test
```

### RLS Tests

RLS tests require a live Supabase instance:

```bash
# 1. Start local Supabase
supabase start

# 2. Apply migrations and seeds
supabase db push
psql -f seeds/20251017_demo_data.sql

# 3. Run RLS tests
npm run test -- tests/rls.test.ts
```

## Schema Overview

### Core Tables

- **org** - Organizations (clinics)
- **member** - User membership with roles
- **patient** - Patient demographics
- **provider** - Ordering providers
- **order** - Clinical orders requiring PA

### PA Workflow

- **pa_request** - Main PA entity
- **pa_checklist_item** - Payer requirements
- **pa_summary** - Medical necessity (versioned)
- **attachment** - Uploaded documents
- **status_event** - Status change history

### Reference Data

- **payer** - Insurance payers (shared)
- **policy_snippet** - Policy knowledge base (shared)

### Audit

- **audit_log** - Comprehensive audit trail

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access data from organizations they belong to.

### RLS Policy Examples

```sql
-- Users can only view patients in their org
CREATE POLICY "Users can view patients in their org"
  ON patient FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- Payers are shared reference data
CREATE POLICY "All users can view payers"
  ON payer FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

### Helper Functions

- `get_user_org_ids(user_uuid)` - Returns user's org IDs
- `is_org_admin(user_uuid, org_uuid)` - Checks admin status
- `audit_action(...)` - Creates audit log entries

## Query SDK

The query SDK provides type-safe, RLS-protected database operations:

```typescript
// Automatic org access check
const result = await getPatientsByOrg(orgId);

// Returns: { success: true, data: [...], error: null }
// OR:      { success: false, data: null, error: "..." }
```

All query functions:

- Check org access before querying
- Return consistent `QueryResult<T>` type
- Include proper error handling
- Respect RLS policies

## Directory Structure

```
packages/db/
├── migrations/          # SQL migrations
│   ├── 20251017000001_initial_schema.sql
│   └── 20251017000002_rls_policies.sql
├── seeds/              # Demo data seeds
│   └── 20251017_demo_data.sql
├── types/              # Generated TypeScript types
│   └── database.ts
├── tests/              # Unit and RLS tests
│   └── rls.test.ts
├── client.ts           # Supabase client setup
├── queries.ts          # Query SDK
├── index.ts            # Main exports
└── README.md           # This file
```

## Documentation

- Full schema documentation: `../../docs/database-schema.md`
- Migration guide: `../../docs/runbooks/migrations.md` (TBD)
- RLS testing guide: `../../docs/runbooks/rls-testing.md` (TBD)

## Troubleshooting

### "Missing environment variable"

Ensure `.env.local` has all required Supabase variables.

### "RLS policy violation"

User doesn't have access to the requested org. Check:

1. User is authenticated
2. User has a `member` record for the org
3. RLS policies are applied correctly

### "Function not found: get_user_org_ids"

Apply migrations:

```bash
supabase db push
```

## Contributing

1. All schema changes must be in migration files
2. Update TypeScript types after schema changes
3. Update query SDK for new table/query patterns
4. Add RLS policies for new tables
5. Document in `docs/database-schema.md`
