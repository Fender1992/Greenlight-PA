# Database Scripts

This directory contains utility scripts for managing the Greenlight PA database.

## Seed Data Script

The `seed-data.ts` script populates your database with comprehensive test data to explore all features of the Greenlight PA application.

### What it seeds

1. **Payers** (5 major insurance companies)
   - BlueCross BlueShield, Aetna, UnitedHealthcare, Cigna, Medicare

2. **Policy Snippets** (4 policy documents)
   - MRI Brain, CT Chest, MRI Lumbar Spine, CT Abdomen/Pelvis policies

3. **Providers** (4 doctors with different specialties)
   - Radiology, Orthopedic Surgery, Neurology, Internal Medicine

4. **Patients** (5 test patients with realistic demographics)

5. **Orders** (5 clinical orders with detailed notes)

6. **PA Requests** (4 requests in different statuses)
   - Draft, Submitted, Pending Info, Approved

7. **Checklist Items** (linked to PA requests)

8. **Medical Necessity Summaries** (for submitted/approved PAs)

9. **Status Events** (tracking PA lifecycle)

### Prerequisites

1. You must have already created an account (signed up) in the application
2. The script will use your organization to seed the data
3. Environment variables must be set (`.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Usage

#### Interactive Mode (Recommended)

Run the script with confirmation prompt:

```bash
tsx scripts/seed-data.ts
```

You will be prompted to type "SEED DATA" to confirm the action.

#### Non-Interactive Mode

For automated scripts or CI/CD:

```bash
CONFIRM=yes tsx scripts/seed-data.ts
```

### Example Output

```
╔════════════════════════════════════════╗
║  Greenlight PA - Seed Test Data       ║
╚════════════════════════════════════════╝

⚠️  WARNING: This will insert test data into your Supabase database
This is safe for development but should not be run in production

Type SEED DATA to continue: SEED DATA

✅ Starting data seeding...

📍 Using org: 123e4567-e89b-12d3-a456-426614174000
👤 Using user: 987fcdeb-51a2-43f7-8d9c-0123456789ab

📋 Seeding payers...
✅ Seeded 5 payers

📚 Seeding policy snippets...
✅ Seeded 4 policy snippets

👨‍⚕️  Seeding providers...
✅ Seeded 4 providers

👤 Seeding patients...
✅ Seeded 5 patients

📝 Seeding orders...
✅ Seeded 5 orders

📋 Seeding PA requests...
✅ Seeded 4 PA requests

✅ Seeding checklist items...
✅ Seeded 6 checklist items

📄 Seeding medical necessity summaries...
✅ Seeded 2 medical necessity summaries

📊 Seeding status events...
✅ Seeded 5 status events

╔════════════════════════════════════════╗
║  ✅ Data seeding complete!            ║
╚════════════════════════════════════════╝

📊 Summary:
   • 5 payers
   • 4 providers
   • 5 patients
   • 5 orders
   • 4 PA requests

You can now log in and explore the application!
```

### What You'll See in the App

After seeding, you'll be able to:

- **Worklist**: View 4 PA requests in different stages
- **Patients**: Browse 5 test patients
- **Orders**: See 5 clinical orders ready for PA creation
- **Metrics**: View approval rates, turnaround times (with real data)
- **Admin**: Manage payers and view policy snippets

### Testing Different Scenarios

The seed data includes realistic scenarios:

1. **Draft PA** - Start here to practice completing a PA request
2. **Submitted PA** - See what a submitted request looks like
3. **Pending Info PA** - Test the "additional information requested" workflow
4. **Approved PA** - See a completed, approved authorization

### Safety

✅ Safe to run multiple times (will create duplicate data)
✅ Only affects your organization's data
✅ Safe for development and staging environments
⚠️ Should not be run in production with real patient data

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
