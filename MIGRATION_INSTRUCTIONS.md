# Migration Instructions

## Database Migrations Needed

The following database migration file has been created but **needs to be run manually** on your Supabase database:

- `/packages/db/migrations/20251024_add_user_profile_fields.sql` (already run)
- `/packages/db/migrations/20251024_add_name_change_and_notifications.sql` (**NEEDS TO BE RUN**)

### How to Run the Migration

1. **Option 1: Via Supabase Dashboard (Recommended)**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to SQL Editor
   - Copy and paste the contents of `/packages/db/migrations/20251024_add_name_change_and_notifications.sql`
   - Click "Run"

2. **Option 2: Via psql command line**

   ```bash
   psql -h aws-0-us-west-1.pooler.supabase.com -p 6543 -U postgres.xhbtofepcnhqxtosrzrm -d postgres -f packages/db/migrations/20251024_add_name_change_and_notifications.sql
   ```

3. **Option 3: Via temporary API endpoint (Development only)**
   - Start your dev server
   - POST to http://localhost:3000/api/migrate/name-change
   - This endpoint was created for convenience but should be removed in production

### After Running the Migration

1. **Regenerate Supabase TypeScript types:**

   ```bash
   npx supabase gen types typescript --project-id xhbtofepcnhqxtosrzrm > packages/db/types.ts
   ```

2. **Update the Supabase client types** in `/packages/db/index.ts` to use the new types

3. **Run type check again:**
   ```bash
   npm run typecheck
   ```

## What Was Implemented

### 1. User Profile Fields in Signup

- Added first_name, last_name, phone_number, and address fields to signup form
- Fields are stored in the `member` table
- Migration: `20251024_add_user_profile_fields.sql`

### 2. User Preferences Page

- Updated preferences page at `/dashboard/preferences`
- Users can directly edit:
  - Phone number
  - Address
- Read-only fields:
  - First name
  - Last name
  - Email
- API endpoint: `PATCH /api/user/profile`

### 3. Name Change Request System

- Users can request name changes via "Request Name Change" button
- Requests go to org admins for approval
- API endpoints:
  - `POST /api/user/name-change-request` - Create request
  - `GET /api/admin/name-change-requests` - List requests (admins only)
  - `PATCH /api/admin/name-change-requests` - Approve/deny requests (admins only)
- Database table: `name_change_request`

### 4. Notification System

- Comprehensive notification system for user events
- Bell icon in navigation bar with unread count badge
- Dropdown shows all notifications with:
  - Title and message
  - Unread status (blue background for unread)
  - "View" link (if applicable)
  - "Mark as read" button
  - "Delete" button
- "Mark all as read" button
- Notifications auto-refresh every 30 seconds
- API endpoints:
  - `GET /api/notifications` - Get user's notifications
  - `PATCH /api/notifications` - Mark as read
  - `DELETE /api/notifications` - Delete notification
- Database table: `notification`

### 5. Notification Types Implemented

The system creates notifications for:

- **name_change_request** - When a user requests a name change (sent to org admins)
- **name_change_approved** - When admin approves a name change request
- **name_change_denied** - When admin denies a name change request

Additional notification types can be easily added:

- PA request created/updated
- Member approved/rejected
- Order status changes
- Coverage issues
- etc.

## Files Created/Modified

### Created:

- `/apps/web/app/api/user/profile/route.ts` - Update phone/address
- `/apps/web/app/api/user/name-change-request/route.ts` - Create name change request
- `/apps/web/app/api/admin/name-change-requests/route.ts` - Review name change requests
- `/apps/web/app/api/notifications/route.ts` - Notification CRUD operations
- `/apps/web/app/api/migrate/name-change/route.ts` - Temporary migration helper (remove in production)
- `/packages/db/migrations/20251024_add_user_profile_fields.sql` - Add profile fields to member table
- `/packages/db/migrations/20251024_add_name_change_and_notifications.sql` - Add name_change_request and notification tables

### Modified:

- `/apps/web/app/signup/page.tsx` - Added profile fields
- `/apps/web/app/dashboard/preferences/page.tsx` - Complete overhaul with profile management
- `/apps/web/app/dashboard/layout.tsx` - Added notification bell icon and dropdown
- `/apps/web/app/api/auth/provision/route.ts` - Store profile fields during signup

## Security & Permissions

### Row Level Security (RLS) Policies

**name_change_request:**

- Users can view their own requests
- Admins can view all requests in their org
- Users can create their own requests
- Admins can update requests in their org

**notification:**

- Users can view their own notifications
- Users can update their own notifications (mark as read)
- Users can delete their own notifications

## Next Steps

1. Run the database migration (see instructions above)
2. Regenerate TypeScript types
3. Test the features:
   - Sign up a new user with profile fields
   - Update phone/address in preferences
   - Request a name change
   - Review as admin
   - Check notifications
4. Remove `/apps/web/app/api/migrate/name-change/route.ts` if not needed
5. Add more notification types as needed throughout the app

## Future Enhancements

- Add email notifications for critical events
- Add notification preferences (which notifications users want to receive)
- Add notification sounds/desktop notifications
- Create admin page for viewing/managing all name change requests
- Add pagination for notifications
- Add notification filtering/search
