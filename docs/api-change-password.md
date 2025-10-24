# Change Password API Endpoint

**Endpoint:** `POST /api/auth/change-password`
**Authentication:** Required
**Created:** 2025-10-24

## Overview

Allows authenticated users to change their password. The endpoint verifies the current password before allowing the update to ensure security.

## Request

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Body

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Fields:**

- `currentPassword` (required, string): The user's current password
- `newPassword` (required, string): The new password (must be at least 8 characters)

## Response

### Success (200 OK)

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Error Responses

#### 400 Bad Request - Missing Fields

```json
{
  "success": false,
  "error": "Both current and new password are required"
}
```

#### 400 Bad Request - Password Too Short

```json
{
  "success": false,
  "error": "New password must be at least 8 characters long"
}
```

#### 400 Bad Request - Same Password

```json
{
  "success": false,
  "error": "New password must be different from current password"
}
```

#### 401 Unauthorized - Incorrect Current Password

```json
{
  "success": false,
  "error": "Current password is incorrect"
}
```

#### 401 Unauthorized - Not Authenticated

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to change password"
}
```

## Validation Rules

1. **Current password is required** - Must provide the existing password
2. **New password is required** - Must provide a new password
3. **Minimum length** - New password must be at least 8 characters
4. **Password difference** - New password must be different from current password
5. **Current password verification** - Current password must be correct

## Usage Examples

### JavaScript/TypeScript (fetch)

```typescript
async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  return response.json();
}

// Usage
try {
  const result = await changePassword("oldPassword123", "newPassword456");
  if (result.success) {
    console.log(result.message); // "Password changed successfully"
  } else {
    console.error(result.error);
  }
} catch (error) {
  console.error("Failed to change password:", error);
}
```

### React Hook Example

```typescript
import { useState } from "react";
import { useToast } from "@web/lib/toast";

export function useChangePassword() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Password changed successfully", "success");
        return true;
      } else {
        showToast(data.error || "Failed to change password", "error");
        return false;
      }
    } catch (error) {
      showToast("An error occurred while changing password", "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading };
}
```

### cURL Example

```bash
curl -X POST https://greenlightpa.net/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "oldPassword123",
    "newPassword": "newSecurePassword456"
  }'
```

## Security Features

1. **Current Password Verification**
   - Requires the current password to prevent unauthorized password changes
   - Uses Supabase's sign-in to verify the current password

2. **Authentication Required**
   - Only authenticated users can change their own password
   - Uses session token from Authorization header or cookie

3. **Password Validation**
   - Enforces minimum password length (8 characters)
   - Prevents setting the same password
   - Server-side validation

4. **Scoped Access**
   - Users can only change their own password
   - No admin override capability

## Implementation Details

**File:** `apps/web/app/api/auth/change-password/route.ts`

The endpoint:

1. Authenticates the user via `requireUser()`
2. Validates input (both passwords present, correct types)
3. Verifies password requirements (length, difference)
4. Confirms current password by attempting sign-in
5. Updates password via Supabase `updateUser()`
6. Returns success/error response

## Error Handling

The endpoint handles various error scenarios:

- Missing or invalid input parameters
- Incorrect current password
- Password validation failures
- Supabase authentication errors
- Unexpected server errors

All errors are logged server-side and return appropriate HTTP status codes.

## Best Practices

1. **Client-Side Validation**
   - Validate password length before sending request
   - Show password strength indicator
   - Confirm new password with re-entry field

2. **User Experience**
   - Show clear error messages
   - Provide feedback on password requirements
   - Auto-logout after password change (optional)

3. **Security**
   - Use HTTPS in production
   - Don't log passwords
   - Consider rate limiting for this endpoint

## Related Endpoints

- `POST /api/auth/provision` - User registration
- `GET /api/auth/status` - Check authentication status
- Password reset flow (if implemented via Supabase email)
