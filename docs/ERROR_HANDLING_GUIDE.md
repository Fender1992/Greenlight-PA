# Graceful Error Handling Guide

**Version:** 1.0
**Last Updated:** 2025-10-24

This guide explains how the application gracefully handles security-related errors introduced by the RBAC hardening.

---

## Overview

After implementing RLS and multi-org RBAC fixes, the application now gracefully handles several security-related scenarios:

1. **RLS Denied (406 errors)** - When users try to access RLS-protected tables
2. **Missing org_id (400 errors)** - When multi-org users don't specify target organization
3. **Unauthorized Access (403 errors)** - When users lack required permissions
4. **Not Found (404 errors)** - When resources don't exist

---

## Error Handling Components

### 1. Error Handler Utility (`apps/web/lib/error-handler.ts`)

Centralized error handling with user-friendly messages.

**Functions:**

- `getUserFriendlyErrorMessage(error)` - Converts technical errors to user-friendly messages
- `handleApiError(showToast)` - Wraps error handling with toast notifications
- `isHttpError(error, status)` - Checks if error matches specific HTTP status
- `isMissingOrgIdError(error)` - Detects missing org_id errors
- `isRlsDeniedError(error)` - Detects RLS policy violations

**Usage Example:**

```typescript
import { handleApiError } from "@web/lib/error-handler";

try {
  const response = await fetch("/api/some-endpoint");
  const data = await response.json();
  if (!data.success) throw data;
} catch (error) {
  handleApiError(showToast)(error);
}
```

---

### 2. Organization Selector (`apps/web/components/OrgSelector.tsx`)

Interactive component for multi-org users to select target organization.

**Props:**

- `value` - Currently selected org ID
- `onChange` - Callback when org is selected
- `label` - Label text (default: "Organization")
- `required` - Whether selection is required
- `filterByRole` - Filter orgs by user's role ("admin", "staff", "referrer")

**Features:**

- Auto-selects if user has only one org (hidden from UI)
- Shows helpful message if user has no orgs
- Displays org count for multi-org users
- Loads memberships from database automatically

**Usage Example:**

```tsx
import { OrgSelector } from "@web/components/OrgSelector";

function MyAdminForm() {
  const [orgId, setOrgId] = useState("");

  return (
    <form>
      <OrgSelector
        value={orgId}
        onChange={setOrgId}
        label="Target Organization"
        required
        filterByRole="admin"
      />
      {/* ... rest of form */}
    </form>
  );
}
```

**Hook: `useIsMultiOrg()`**

```tsx
const { isMultiOrg, loading } = useIsMultiOrg();

if (isMultiOrg) {
  // Show org selector or warning
}
```

---

### 3. Super Admin Page Protection

The super admin page now uses API verification instead of direct table queries.

**Before (RLS fails):**

```typescript
const { data } = await supabase
  .from("super_admin")
  .select("id")
  .eq("user_id", session.user.id)
  .single();
```

**After (RLS-safe):**

```typescript
const response = await fetch("/api/super-admin/stats");
const data = await response.json();
if (!data.success) {
  // Not a super admin
  showToast("You do not have access to this page", "error");
  router.push("/dashboard");
}
```

---

### 4. Improved Error Messages in `org.ts`

**Multi-org users without org_id:**

```
org_id parameter is required. You have 3 organization memberships.
Please specify which organization using the org_id query parameter
or in the request body.
```

**Super admins without org_id:**

```
org_id parameter is required for super admin operations.
Please specify the target organization using the org_id query
parameter or in the request body.
```

---

## Common Error Scenarios

### Scenario 1: RLS Denied on super_admin Table

**Error:** 406 or "row-level security policy violation"

**Handling:**

- Frontend: Super admin page uses API endpoint instead of direct query
- Dashboard: Uses `.maybeSingle()` for graceful failure
- User sees: "Access denied" or page redirect with toast message

**Developer Action:**

- Use service_role client for backend queries
- Use API endpoints for frontend verification
- Never query super_admin directly from client

---

### Scenario 2: Multi-Org User Without org_id

**Error:** 400 "org_id parameter is required"

**Handling:**

- User sees clear message: "You have X organization memberships. Please specify which organization..."
- Use `OrgSelector` component in forms
- API includes helpful instructions in error message

**Developer Action:**

```typescript
// Option 1: Use OrgSelector component
<OrgSelector value={orgId} onChange={setOrgId} required />

// Option 2: Pass org_id in query params
fetch(`/api/some-endpoint?org_id=${orgId}`)

// Option 3: Pass org_id in request body
fetch('/api/some-endpoint', {
  method: 'POST',
  body: JSON.stringify({ org_id: orgId, ...data })
})
```

---

### Scenario 3: Unauthorized Admin Action

**Error:** 403 "This operation requires admin privileges"

**Handling:**

- User sees: "This action requires administrator privileges."
- Dashboard hides admin tabs for non-admins
- API returns clear 403 with explanation

**Developer Action:**

- Use `requireOrgAdmin()` in API routes
- Check `userRole` state in frontend
- Show/hide admin features conditionally

---

### Scenario 4: Network or Timeout Errors

**Handling:**

- User sees: "Network error. Please check your connection and try again."
- Or: "Request timed out. Please try again."
- Error logged to console for debugging

**Developer Action:**

```typescript
try {
  const response = await fetch("/api/endpoint", { timeout: 10000 });
} catch (error) {
  handleApiError(showToast)(error);
}
```

---

## Best Practices

### 1. Always Use Error Handler Utility

```typescript
import { getUserFriendlyErrorMessage, handleApiError } from "@web/lib/error-handler";

// In async functions with toast
try {
  // ... API call
} catch (error) {
  handleApiError(showToast)(error);
}

// Or manually
catch (error) {
  const message = getUserFriendlyErrorMessage(error);
  showToast(message, "error");
}
```

### 2. Use OrgSelector for Admin Forms

```tsx
// Always use for admin operations
<OrgSelector value={orgId} onChange={setOrgId} required filterByRole="admin" />
```

### 3. Check Multi-Org Status

```typescript
const { isMultiOrg } = useIsMultiOrg();

if (isMultiOrg) {
  // Show org selector
  // Add helpful instructions
}
```

### 4. Provide Context in Error Messages

```typescript
throw new HttpError(
  400,
  `org_id parameter is required. You have ${count} organizations. ` +
    `Please specify which organization using the org_id query parameter.`
);
```

### 5. Log Errors for Debugging

```typescript
catch (error) {
  console.error("Detailed error for debugging:", error);
  showToast(getUserFriendlyErrorMessage(error), "error");
}
```

---

## Testing Error Handling

### Test RLS Protection

```typescript
// Should fail gracefully
const { data, error } = await supabase
  .from("super_admin")
  .select("*")
  .maybeSingle();

// error will be RLS violation
// data will be null
// No crash, graceful handling
```

### Test Missing org_id

```typescript
// Multi-org user without org_id
const response = await fetch("/api/org", {
  method: "PATCH",
  body: JSON.stringify({ name: "New Name" }),
  // Missing org_id!
});

// Should return 400 with helpful message
const data = await response.json();
expect(data.error).toContain("org_id parameter is required");
```

### Test Unauthorized Access

```typescript
// Non-admin trying admin operation
const response = await fetch("/api/admin/pending-members");

// Should return 403
expect(response.status).toBe(403);
```

---

## Monitoring & Alerts

### Expected Errors (Normal Behavior)

- **406 errors on super_admin queries** - RLS working correctly
- **400 errors for missing org_id** - Multi-org users need guidance
- **403 errors for unauthorized ops** - Security working correctly

### Unexpected Errors (Investigate)

- **500 errors** - Server issues, check logs
- **401 errors** - Authentication problems
- **Repeated 400 errors from same user** - UI/UX issue, add org selector

---

## Examples

### Complete Admin Form with Error Handling

```tsx
import { useState } from "react";
import { OrgSelector } from "@web/components/OrgSelector";
import { handleApiError } from "@web/lib/error-handler";
import { useToast } from "@web/lib/toast";

export function AdminForm() {
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/some-operation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId /* other data */ }),
      });

      const data = await response.json();

      if (!data.success) {
        throw data; // Will be caught and handled gracefully
      }

      showToast("Operation successful!", "success");
    } catch (error) {
      handleApiError(showToast)(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <OrgSelector
        value={orgId}
        onChange={setOrgId}
        required
        filterByRole="admin"
      />
      {/* ... other fields */}
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
```

---

## Troubleshooting

### User reports: "Access denied" on super admin page

- **Check:** Is user actually in super_admin table?
- **Verify:** `/api/super-admin/stats` endpoint working?
- **Test:** Can service_role query super_admin?

### User reports: "org_id parameter required"

- **Check:** Is user multi-org? (membership count > 1)
- **Fix:** Add `<OrgSelector>` to the form
- **Or:** Pass org_id in URL: `?org_id=xxx`

### Errors not showing user-friendly messages

- **Check:** Using `handleApiError()` in catch blocks?
- **Verify:** Error format matches expected structure
- **Debug:** Log raw error to see actual format

---

_End of Error Handling Guide_
