# @greenlight/email

Email notification service for Greenlight PA using [Resend](https://resend.com).

## Features

- **Member Approval/Rejection Notifications**: Automatically notify users when their organization access is approved or rejected
- **PA Request Status Changes**: Send emails when PA requests move to important states (submitted, approved, denied, pending_info)
- **Name Change Requests**: Notify users when their name change requests are approved or denied
- **Graceful Degradation**: Works without email configuration (logs notifications instead)
- **Non-blocking**: Email sending never blocks main API operations

## Setup

### 1. Get a Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Create an API key from your dashboard
3. Add the API key to your `.env` file:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@greenlight-pa.com  # Optional, defaults to noreply@greenlight-pa.com
```

### 2. Configure Your Domain (Production)

For production use, you'll want to:

1. Add and verify your domain in Resend
2. Configure DKIM/SPF records for better deliverability
3. Update the `EMAIL_FROM` environment variable to use your domain

**Note**: Without configuring `RESEND_API_KEY`, the email service will still work but will only log notifications to the console instead of sending actual emails.

## Usage

### Sending Email Notifications

```typescript
import { sendEmailNotification } from "@greenlight/email";

// Member approved notification
await sendEmailNotification({
  to: "user@example.com",
  type: "member_approved",
  data: {
    orgName: "Acme Healthcare",
    role: "staff",
    appUrl: "https://app.greenlight-pa.com",
  },
});

// PA status changed notification
await sendEmailNotification({
  to: "user@example.com",
  type: "pa_status_changed",
  data: {
    patientName: "John Doe",
    orderId: "abc-123",
    status: "approved",
    note: "Approved by Dr. Smith",
    paRequestId: "pa-456",
    appUrl: "https://app.greenlight-pa.com",
  },
});

// Name change approved notification
await sendEmailNotification({
  to: "user@example.com",
  type: "name_change_approved",
  data: {
    orgName: "Acme Healthcare",
    newFirstName: "Jane",
    newLastName: "Smith",
    appUrl: "https://app.greenlight-pa.com",
  },
});
```

### Non-blocking Pattern

In API routes, email sending should never block the main operation:

```typescript
// Update database first
const { data, error } = await supabase
  .from("member")
  .update({ status: "active" })
  .eq("id", memberId);

if (error) {
  throw new Error("Database error");
}

// Send email notification (non-blocking)
sendEmailNotification({
  to: userEmail,
  type: "member_approved",
  data: {
    /* ... */
  },
}).catch((err) => {
  console.error("Failed to send email:", err);
});

// Return response immediately
return { success: true, data };
```

## Notification Types

### `member_approved`

Sent when an admin approves a pending member.

**Required data:**

- `orgName: string` - Name of the organization
- `role: string` - Role assigned to the member (admin, staff, referrer)
- `appUrl: string` - Base URL of the application

### `member_rejected`

Sent when an admin rejects a pending member.

**Required data:**

- `orgName: string` - Name of the organization

### `pa_status_changed`

Sent when a PA request status changes to: submitted, approved, denied, or pending_info.

**Required data:**

- `patientName: string` - Name of the patient
- `orderId: string` - ID of the order
- `status: string` - New status
- `paRequestId: string` - ID of the PA request
- `appUrl: string` - Base URL of the application
- `note?: string` - Optional note about the status change

### `name_change_approved`

Sent when an admin approves a name change request.

**Required data:**

- `orgName: string` - Name of the organization
- `newFirstName: string` - Approved first name
- `newLastName: string` - Approved last name
- `appUrl: string` - Base URL of the application

### `name_change_denied`

Sent when an admin denies a name change request.

**Required data:**

- `orgName: string` - Name of the organization
- `denialReason: string` - Reason for denial
- `appUrl: string` - Base URL of the application

## Email Templates

All email templates are responsive and mobile-friendly, using:

- Clean, professional design with gradient headers
- Clear call-to-action buttons
- Consistent branding across all notifications
- Proper fallbacks for email clients

Templates are located in `src/templates/` and can be customized as needed.

## Development

Without a Resend API key configured, the email service will log notifications:

```
[Email] Would send member_approved email to user@example.com (disabled)
```

This allows you to develop and test without needing email infrastructure.

## Error Handling

All email operations are wrapped in try-catch blocks and return result objects:

```typescript
const result = await sendEmailNotification({
  /* ... */
});

if (!result.success) {
  console.error("Email failed:", result.error);
}
```

Errors are logged but never thrown, ensuring email failures don't break your application.

## Architecture

- **Client** (`src/client.ts`): Main email sending logic with Resend integration
- **Templates** (`src/templates/`): HTML email templates for each notification type
- **Types** (`src/types.ts`): TypeScript interfaces for type safety

## Production Checklist

Before going to production:

- [ ] Sign up for Resend and add API key
- [ ] Verify your domain in Resend
- [ ] Configure DKIM/SPF DNS records
- [ ] Update `EMAIL_FROM` to use your domain
- [ ] Test each notification type
- [ ] Monitor email delivery rates in Resend dashboard
- [ ] Set up email bounce/complaint handling (optional)
