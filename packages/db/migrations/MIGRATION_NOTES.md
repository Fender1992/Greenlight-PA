# Migration Analysis & Cleanup Notes

**Date**: 2025-11-27
**Purpose**: Document duplicate/confusing migration files and recommend cleanup actions

---

## Current Database State (Member Table)

Based on production database inspection, the `member` table has the following columns:

- `id`, `org_id`, `user_id`, `role`, `created_at` (from initial schema)
- `has_seen_tour` (from tour flag migration)
- `first_name`, `last_name`, `phone_number`, `address` (from profile fields migration)
- `status` (from status migration)
- **Does NOT have**: `updated_at`

---

## Migration Files Analysis

### 1. Tour Flag Migrations (No Issues)

- `20251020_add_tour_flag.sql` - **APPLIED**: Adds `has_seen_tour` column
- `20251020000002_backfill_tour_status.sql` - **APPLIED**: Backfills tour status

### 2. Profile Fields Migrations (DUPLICATES - Both Functionally Identical)

#### `20251024_add_member_profile_fields.sql`

- **Size**: 1,117 bytes
- **Adds**: `first_name`, `last_name`, `phone_number`, `address`
- **Features**: Includes index on names, detailed comments
- **Status**: **LIKELY APPLIED** (fields exist in production)

#### `20251024_add_user_profile_fields.sql`

- **Size**: 637 bytes
- **Adds**: Same 4 fields (`first_name`, `last_name`, `phone_number`, `address`)
- **Features**: Basic comments only, no index
- **Status**: **DUPLICATE - LIKELY NOT APPLIED** (or applied after the other)
- **Note**: Uses `IF NOT EXISTS` so it's idempotent

**Analysis**: These two migrations do the exact same thing. The `add_member_profile_fields` version is more complete with an index. Both use `IF NOT EXISTS` so they're safe to run multiple times.

**Recommendation**: Keep `20251024_add_member_profile_fields.sql`, delete `20251024_add_user_profile_fields.sql`

---

### 3. Status Migrations (CRITICAL DUPLICATES - Different Approaches)

#### `20251024_add_member_status.sql`

- **Size**: 4,286 bytes
- **Approach**: Adds status column, updates RLS policies by dropping and recreating them
- **Issues**:
  - Tries to `DROP POLICY IF EXISTS "member_policy"` which may not exist
  - Updates helper functions but doesn't use CASCADE
  - **LIKELY FAILED**: Would have caused dependency errors when dropping functions
- **Status**: **NOT APPLIED** (would have failed with dependency errors)

#### `20251024_add_member_status_cascade.sql`

- **Size**: 11,025 bytes
- **Approach**: Adds status column, uses `DROP FUNCTION ... CASCADE` to drop all dependent policies
- **Features**:
  - Comprehensively recreates ALL RLS policies for ALL tables
  - Properly handles cascade dependencies
  - Very thorough but extreme (recreates everything)
- **Status**: **POSSIBLY APPLIED** but likely failed or was abandoned
- **Issues**:
  - Recreates policies for tables that may have been modified by other migrations
  - Massive scope - recreates 40+ policies

#### `20251024_add_member_status_fixed.sql`

- **Size**: 4,431 bytes
- **Approach**: Adds status column, drops functions WITHOUT cascade, then recreates policies
- **Features**:
  - Explicitly drops old policies before creating new ones
  - Drops functions with `IF EXISTS` (safer)
  - More targeted than cascade version
  - Clean, focused approach
- **Status**: **LIKELY APPLIED** (status column exists in production)

**Analysis**:

1. The first version (`add_member_status.sql`) likely failed due to dependency issues
2. The cascade version (`add_member_status_cascade.sql`) was likely an attempt to fix it with CASCADE
3. The fixed version (`add_member_status_fixed.sql`) appears to be the final working version

**Evidence that `_fixed` was applied**:

- The `status` column exists in production
- The `_fixed` version is the most pragmatic approach
- It explicitly handles the policy recreation issue from the first version

**Recommendation**: Keep `20251024_add_member_status_fixed.sql`, delete the other two status migrations

---

### 4. Name Change Migration (No Issues)

- `20251024_add_name_change_and_notifications.sql`
- **Status**: **APPLIED** (creates new tables, references member.status in RLS policies)
- **Note**: This migration depends on the status column existing, which confirms status migration ran first

---

## Summary of Duplicates

### Confirmed Duplicates to Delete:

1. **`20251024_add_user_profile_fields.sql`** - Duplicate of `add_member_profile_fields.sql`
2. **`20251024_add_member_status.sql`** - Failed version, superseded by `_fixed`
3. **`20251024_add_member_status_cascade.sql`** - Overly aggressive version, superseded by `_fixed`

### Files to Keep:

1. **`20251024_add_member_profile_fields.sql`** - Successfully applied, has index
2. **`20251024_add_member_status_fixed.sql`** - Successfully applied, final working version

---

## Recommended Cleanup Actions

### Step 1: Archive (Don't Delete) Failed Migrations

Create an `archive/` subdirectory and move failed attempts there:

```bash
mkdir -p /root/greenlight-pa/packages/db/migrations/archive
mv /root/greenlight-pa/packages/db/migrations/20251024_add_member_status.sql archive/
mv /root/greenlight-pa/packages/db/migrations/20251024_add_member_status_cascade.sql archive/
mv /root/greenlight-pa/packages/db/migrations/20251024_add_user_profile_fields.sql archive/
```

### Step 2: Add Archive README

Document why these were archived in `archive/README.md`

### Step 3: Update Migration Tracker (if exists)

If there's a migration tracking table or system, ensure only the `_fixed` versions are marked as applied.

---

## Migration Execution Order (Likely Applied)

Based on the analysis, these migrations were likely applied in this order:

1. `20251017000001_initial_schema.sql` - Creates base tables
2. `20251017000002_rls_policies.sql` - Creates initial RLS policies
3. `20251020_add_tour_flag.sql` - Adds `has_seen_tour` column
4. `20251020000002_backfill_tour_status.sql` - Backfills tour status
5. `20251024_add_member_profile_fields.sql` - Adds profile fields ✓
6. `20251024_add_member_status_fixed.sql` - Adds status column ✓
7. `20251024_add_name_change_and_notifications.sql` - Adds name change tables
8. `20251024_add_order_columns.sql` - Adds order columns
9. `20251024_add_pa_request_patient_provider.sql` - PA request changes
10. `20251024_add_super_admin.sql` - Super admin features
11. `20251024_super_admin_rls.sql` - Super admin RLS policies

---

## Notes for Future Migrations

1. **Use versioned timestamps**: Consider using more precise timestamps (e.g., `20251024_120000_description.sql`) to avoid same-day collisions
2. **Test before applying**: Always test migrations in a development environment
3. **Use IF EXISTS/IF NOT EXISTS**: Makes migrations more idempotent
4. **Document dependencies**: Note which migrations depend on others
5. **Keep one source of truth**: Don't create duplicate migrations for the same feature

---

## Risk Assessment

**LOW RISK** to delete the identified duplicates because:

1. They were never successfully applied (failed or superseded)
2. The working versions are already in production
3. Both profile field migrations use `IF NOT EXISTS` (idempotent)
4. Archiving (vs deleting) preserves history for debugging

**CAUTION**: Do NOT re-run the cascade migration - it would recreate all RLS policies and could break current functionality.

---

**Generated by**: Claude Code
**Last Updated**: 2025-11-27
