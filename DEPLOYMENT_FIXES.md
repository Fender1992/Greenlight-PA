# Deployment Fixes Required

## Issues Found

### 1. Generate Checklist Fails (503 Error)

**Error:** `/api/llm/checklist` returns 503 Service Unavailable

**Root Cause:** The `ENABLE_LLM` environment variable is not set to `true` on Vercel.

**Note:** You are using CacheGPT, not direct Anthropic API. The `CACHEGPT_API_KEY` is already configured in Vercel.

**Fix:**

```bash
# Add ENABLE_LLM environment variable to Vercel
vercel env add ENABLE_LLM

# When prompted:
# - Value: true
# - Environments: Production, Preview, Development (select all)
```

The LLM client is already configured to use CacheGPT:

- ✅ `CACHEGPT_API_KEY` is set in Vercel
- ✅ Client automatically routes through `https://cachegpt.app/v1`
- ❌ `ENABLE_LLM` flag is missing (needed to enable the feature)

---

### 2. Tour Status API Fails (500 Error)

**Error:** `/api/member/tour-status` returns 500 Internal Server Error

**Possible Root Causes:**

1. Authentication token not being passed correctly
2. RLS policies blocking access
3. Member record missing for the user

**Debugging Steps:**

1. **Check Vercel logs:**

```bash
vercel logs greenlightpa.net --limit 50
```

Look for error messages related to `/api/member/tour-status`

2. **Verify member record exists:**
   The tour status endpoint queries the `member` table. Ensure your user has a member record:

```sql
-- Run this in Supabase SQL Editor
SELECT u.id as user_id, u.email, m.org_id, m.has_seen_tour
FROM auth.users u
LEFT JOIN member m ON m.user_id = u.id
WHERE u.email = 'your-email@example.com';
```

3. **Check RLS policies:**
   The endpoint uses `getScopedClient(token)` which relies on RLS. Verify the member table has proper SELECT policies.

---

## Quick Fixes

### Option 1: Disable LLM Features (Temporary)

If you don't need LLM features right now, the app should work without them. The 503 error is expected when `ENABLE_LLM` is not set.

### Option 2: Enable LLM Features (Recommended - CacheGPT Already Configured)

Since you already have `CACHEGPT_API_KEY` configured in Vercel, just enable the feature flag:

```bash
vercel env add ENABLE_LLM
# Value: true
# Environments: Production, Preview, Development (select all)

vercel --prod  # Redeploy
```

Your CacheGPT proxy at `https://cachegpt.app/v1` will automatically handle all Claude API calls with intelligent caching.

### Option 3: Fix Tour Status Endpoint

The tour status endpoint should work. To debug:

1. Check server logs on Vercel
2. Verify the user has a member record in the database
3. Ensure authentication is working properly

---

## Environment Variables Checklist

Make sure these are set in Vercel:

**Supabase:**

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `NEXT_SUPABASE_URL`
- ✅ `NEXT_SUPABASE_ANON_KEY`
- ✅ `NEXT_SUPABASE_ROLE_KEY`
- ✅ `NEXT_SUPABASE_JWT_SECRET`

**LLM (CacheGPT):**

- ✅ `CACHEGPT_API_KEY` (already configured)
- ❌ `ENABLE_LLM` (missing - set to `true` to enable features)

**Other:**

- ✅ `NEXT_PUBLIC_APP_URL`

---

## Testing After Fixes

1. **Test Checklist Generation:**
   - Navigate to a PA request detail page
   - Click "Generate Checklist"
   - Should either work (if LLM enabled) or show a clear error message

2. **Test Tour:**
   - Sign up as a new user
   - Should see the product tour on first login to dashboard
   - Tour should not appear again after completion

---

## Notes

- The browser errors about "message channel closed" are from browser extensions (likely password managers) and can be ignored
- The autofill overlay error is also from a browser extension and doesn't affect functionality
- Focus on fixing the 503 and 500 errors from the API endpoints
