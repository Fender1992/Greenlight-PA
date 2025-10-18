# Database Scripts

This directory contains utility scripts for managing the Greenlight PA database.

## Reset Users Script

The `reset-users.ts` script allows you to completely reset all users in the database.

### What it does

1. Deletes all member records from the `member` table
2. Deletes all organization records from the `org` table
3. Deletes all users from Supabase Auth (`auth.users`)

### Prerequisites

You need the following environment variables set:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (admin access)

These should already be in your `.env.local` file.

### Usage

#### Interactive Mode (Recommended)

Run the script with confirmation prompt:

```bash
npm run reset-users
```

You will be prompted to type "DELETE ALL USERS" to confirm the action.

#### Non-Interactive Mode

For automated scripts or CI/CD, you can skip the confirmation:

```bash
CONFIRM=yes npm run reset-users
```

### Safety

⚠️ **WARNING**: This script is destructive and cannot be undone!

- Always backup your data before running this script
- Use with extreme caution in production environments
- Consider running this only in development/staging environments

### Example Output

```
🔍 Starting user reset process...

📋 Fetching all users from auth.users...
   Found 5 user(s)

⚠️  WARNING: This will DELETE ALL USERS and related data!
This action CANNOT be undone.

Type "DELETE ALL USERS" to confirm: DELETE ALL USERS

🗑️  Starting deletion process...

🗑️  Deleting all member records...
   ✅ All members deleted

🗑️  Deleting all organizations...
   ✅ All organizations deleted

🗑️  Deleting all auth users...
   ✅ Deleted user: user1@example.com
   ✅ Deleted user: user2@example.com
   ✅ Deleted user: user3@example.com
   ✅ Deleted user: user4@example.com
   ✅ Deleted user: user5@example.com

==================================================
📊 Reset Summary:
   Total users found: 5
   Successfully deleted: 5
   Failed to delete: 0
==================================================

✅ User reset completed successfully!
```

## Email Validation

The application now includes email validation to prevent duplicate signups:

### API Endpoint: `/api/auth/check-email`

Check if an email address is already registered:

```typescript
POST /api/auth/check-email
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "available": false,
  "message": "Email is already registered"
}
```

### Signup Page Validation

The signup page (`/signup`) now validates emails before attempting to create an account:

1. **Format Validation**: Ensures email is in valid format
2. **Duplicate Check**: Queries the database to check if email already exists
3. **User Feedback**: Shows clear error messages if email is already registered

This prevents:

- Confusing errors from Supabase about duplicate emails
- Unnecessary API calls to create accounts that will fail
- Better user experience with immediate feedback

### Implementation

The validation happens client-side before calling `supabase.auth.signUp()`:

```typescript
// Check if email already exists
const checkResponse = await fetch("/api/auth/check-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});

const checkData = await checkResponse.json();

if (checkData.success && !checkData.available) {
  setError("This email is already registered. Please sign in instead.");
  return;
}
```

If the check fails (network error, etc.), the signup continues - Supabase will catch any duplicates as a fallback.
