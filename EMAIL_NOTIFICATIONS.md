# Email Notifications Implementation

This document describes the email notification system implemented for Greenlight PA.

## Overview

Email notifications have been implemented using [Resend](https://resend.com), a modern email API service. The implementation is designed to be:

- **Optional**: Works without configuration (logs instead of sending)
- **Non-blocking**: Never blocks main API operations
- **Type-safe**: Full TypeScript support
- **Maintainable**: Clean separation of templates and logic

## What's Implemented

### 1. Member Approval/Rejection Notifications

**Trigger**: When an admin approves or rejects a pending member
**Recipients**: The user who requested access
**Location**: `/apps/web/app/api/admin/pending-members/route.ts`

**Email Types**:

- **Approval**: Welcomes the user, shows their role, and provides a link to the dashboard
- **Rejection**: Politely informs them their request was not approved

### 2. PA Request Status Change Notifications

**Trigger**: When a PA request status changes to: submitted, approved, denied, or pending_info
**Recipients**: The user who created the PA request (if `created_by` is set)
**Location**: `/apps/web/app/api/pa-requests/[id]/route.ts`

**Email Includes**:

- Patient name
- Order ID
- New status with color-coded badge
- Optional note from the status change
- Direct link to the PA request

### 3. Name Change Request Response Notifications

**Trigger**: When an admin approves or denies a name change request
**Recipients**: The member who requested the name change
**Location**: `/apps/web/app/api/admin/name-change-requests/route.ts`

**Email Types**:

- **Approval**: Confirms the new name and updates the member record
- **Denial**: Explains the reason for denial

## Package Structure

```
packages/email/
├── src/
│   ├── client.ts                 # Email sending logic
│   ├── types.ts                  # TypeScript interfaces
│   ├── templates/
│   │   ├── index.ts
│   │   ├── member-approved.ts
│   │   ├── member-rejected.ts
│   │   ├── pa-status-changed.ts
│   │   ├── name-change-approved.ts
│   │   └── name-change-denied.ts
│   └── index.ts                  # Package exports
├── package.json
├── tsconfig.json
└── README.md
```

## Setup Instructions

### Development (No Email Sending)

No setup required! The app works without email configuration. Notifications will be logged to console:

```
[Email] Would send member_approved email to user@example.com (disabled)
```

### Production (Real Email Sending)

1. **Sign up for Resend**:
   - Go to [https://resend.com](https://resend.com)
   - Create a free account (100 emails/day on free tier)

2. **Get API Key**:
   - In Resend dashboard, create an API key
   - Add to your `.env`:

   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_FROM=noreply@greenlight-pa.com
   ```

3. **Verify Domain** (Production):
   - Add your domain in Resend dashboard
   - Configure DKIM/SPF DNS records
   - Update `EMAIL_FROM` to use your verified domain

## How It Works

### Non-blocking Pattern

All email sending is non-blocking to ensure database operations complete successfully even if email fails:

```typescript
// 1. Perform database operation
const { data, error } = await supabase.from("member").update(...);

if (error) {
  throw new HttpError(500, error.message);
}

// 2. Send email (non-blocking)
sendEmailNotification({...}).catch((err) => {
  console.error("Email failed:", err);
});

// 3. Return response immediately
return NextResponse.json({ success: true, data });
```

### Email Client

The email client (`packages/email/src/client.ts`) handles:

- Checking for API key configuration
- Selecting the appropriate template
- Sending via Resend API
- Error handling and logging
- Graceful degradation when not configured

### Templates

Each template is a function that returns HTML:

```typescript
export function memberApprovedTemplate(data: MemberApprovedData): string {
  const { orgName, role, appUrl } = data;

  return `
    <!DOCTYPE html>
    <html>
      <!-- Responsive email HTML -->
    </html>
  `;
}
```

Templates use:

- Inline CSS for maximum email client compatibility
- Responsive design for mobile devices
- Gradient headers for visual appeal
- Clear call-to-action buttons

## Integration Points

### 1. Pending Members Route

**File**: `/apps/web/app/api/admin/pending-members/route.ts`

Emails sent when:

- Admin approves a pending member → `member_approved`
- Admin rejects a pending member → `member_rejected`

### 2. PA Request Route

**File**: `/apps/web/app/api/pa-requests/[id]/route.ts`

Emails sent when status changes to:

- `submitted` - PA was submitted to payer
- `approved` - PA was approved
- `denied` - PA was denied
- `pending_info` - More information needed

### 3. Name Change Request Route

**File**: `/apps/web/app/api/admin/name-change-requests/route.ts`

Emails sent when:

- Admin approves name change → `name_change_approved` + updates member record
- Admin denies name change → `name_change_denied`

## Testing

### Manual Testing

1. **Without Resend configured**:

   ```bash
   # No RESEND_API_KEY in .env
   npm run dev
   ```

   Perform actions and check console logs

2. **With Resend configured**:

   ```bash
   # Add to .env
   RESEND_API_KEY=re_xxxxx
   EMAIL_FROM=test@example.com

   npm run dev
   ```

   Perform actions and check your email

### Test Scenarios

- [ ] Approve a pending member
- [ ] Reject a pending member
- [ ] Change PA request status to each notification-worthy state
- [ ] Approve a name change request
- [ ] Deny a name change request

## Environment Variables

Required for email sending (optional otherwise):

```bash
# Required for sending emails
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Optional - defaults to noreply@greenlight-pa.com
EMAIL_FROM=noreply@yourdomain.com

# Required for proper links in emails
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Monitoring & Debugging

### Console Logs

The email service logs all operations:

```
[Email] Would send member_approved email to user@example.com (disabled)
[Email] Successfully sent member_approved to user@example.com
[Email] Failed to send pa_status_changed: Invalid API key
```

### Resend Dashboard

Once configured, you can monitor:

- Delivery rates
- Bounces and complaints
- Email logs and events
- API usage

## Future Enhancements

Potential improvements for the future:

1. **Email Preferences**: Allow users to opt-out of certain notifications
2. **Batch Notifications**: Daily digest of PA status changes
3. **SMS Notifications**: Add Twilio for urgent notifications
4. **Email Templates**: Rich editor for customizing templates
5. **Notification History**: Store sent notifications in database
6. **Retry Logic**: Automatic retry for failed emails
7. **Webhooks**: Handle bounces and unsubscribes via Resend webhooks

## Troubleshooting

### Emails not sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify API key is valid in Resend dashboard
3. Check console logs for error messages
4. Ensure `EMAIL_FROM` uses verified domain (production)

### Wrong recipient email

1. Check user email in Supabase auth table
2. Verify user_id associations in database
3. Add logging to see what email is being used

### Styling issues

1. Email clients have limited CSS support
2. Test in multiple clients (Gmail, Outlook, Apple Mail)
3. Use inline styles only
4. Avoid modern CSS features

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Email Package README](/packages/email/README.md)
- [Email HTML Best Practices](https://www.campaignmonitor.com/css/)
