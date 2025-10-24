# Super Admin Setup Instructions

**Date:** 2025-10-24
**User:** rolandofender@gmail.com

## Overview

Created a super admin role system that grants platform-level administrative access to all organizations. Super admins can:

- Access all organizations in the system
- Perform admin operations on any organization
- Bypass normal membership restrictions

## Step 1: Run Database Migration

1. Go to the Supabase SQL Editor:
   https://supabase.com/dashboard/project/xhbtofepcnhqxtosrzrm/sql/new

2. Copy the SQL from: `/home/rolo/Greenlight/packages/db/migrations/20251024_add_super_admin.sql`

3. Paste and run the SQL

4. Verify the migration succeeded (should see "Success. No rows returned")

## Step 2: Assign Super Admin to Your User

Once the migration is complete, run the assignment script:

```bash
cd /home/rolo/Greenlight
npx tsx scripts/assign-super-admin.ts
```

This script will:

1. Find your user by email (rolandofender@gmail.com)
2. Create a super_admin record for your user
3. Verify the assignment worked
4. Show all organizations you now have access to

## What Was Changed

### Database Changes

1. **New Table: `super_admin`**
   - Tracks which users have platform-level admin access
   - Fields: id, user_id, granted_by, granted_at, notes

2. **Updated `member` Table**
   - Role constraint now includes 'super_admin' as valid role
   - CHECK constraint: `role IN ('admin', 'staff', 'referrer', 'super_admin')`

3. **New Database Functions**
   - `is_super_admin(user_uuid)` - Returns true if user is super admin
   - Updated `get_user_org_ids()` - Returns ALL org IDs for super admins
   - Updated `is_org_admin()` - Returns true for super admins on any org

### API Changes

**File:** `apps/web/app/api/_lib/org.ts`

1. **New Function: `isSuperAdmin(userId)`**
   - Checks if a user has super admin privileges

2. **Updated `resolveOrgId()`**
   - Super admins can access any organization
   - Automatically grants access without membership check

3. **Updated `resolveOrgRole()`**
   - Returns 'super_admin' role for super admins
   - Return type: `"admin" | "staff" | "referrer" | "super_admin"`

4. **Updated `requireOrgAdmin()`**
   - Accepts both 'admin' and 'super_admin' roles
   - Super admins can perform admin operations on any org

### Type Definitions

**File:** `packages/db/types/database.ts`

Added `super_admin` table types:

```typescript
super_admin: {
  Row: {
    id: string;
    user_id: string;
    granted_by: string | null;
    granted_at: string;
    notes: string | null;
  }
  // Insert and Update types...
}
```

## Security Considerations

1. **Platform-Level Access**: Super admins bypass RLS policies and can see all data
2. **Audit Trail**: All super admin grants are logged with granted_by and granted_at
3. **Database Functions**: Helper functions use SECURITY DEFINER to work across RLS
4. **No Self-Escalation**: Regular users cannot grant themselves super admin access

## Usage Examples

### As a Super Admin

1. **Access Any Organization**
   - API calls will automatically grant access to any org_id
   - No need to be a member of the organization

2. **Admin Operations**
   - Can approve/reject members in any organization
   - Can manage users, patients, orders, PA requests across all orgs

3. **Organization Switching**
   - Provide `org_id` query parameter to switch between organizations
   - Example: `/api/patients?org_id=xxx-yyy-zzz`

### Checking Super Admin Status

In API routes:

```typescript
import { isSuperAdmin } from "../_lib/org";

const superAdmin = await isSuperAdmin(user.id);
if (superAdmin) {
  // User has platform-level access
}
```

## Files Modified

1. `/home/rolo/Greenlight/packages/db/migrations/20251024_add_super_admin.sql` - NEW
2. `/home/rolo/Greenlight/scripts/assign-super-admin.ts` - NEW
3. `/home/rolo/Greenlight/packages/db/types/database.ts` - Added super_admin table types
4. `/home/rolo/Greenlight/apps/web/app/api/_lib/org.ts` - Added super admin support

## Next Steps

After running the migration and assignment script:

1. Test accessing different organizations
2. Verify super admin can see all organizations in the UI
3. Test admin operations (approve members, manage data, etc.)
4. Consider adding a super admin indicator in the UI

## Troubleshooting

### Migration Fails

- Check for syntax errors in SQL
- Ensure previous migrations have been applied
- Check Supabase logs for error details

### Assignment Script Fails

- Ensure migration has been run first
- Verify email is correct (rolandofender@gmail.com)
- Check that user exists in auth.users

### Super Admin Not Working

- Verify super_admin record exists: `SELECT * FROM super_admin;`
- Check function returns true: `SELECT is_super_admin('your-user-id');`
- Clear any cached sessions and re-login
