/**
 * Package: @greenlight/email/templates | Status: ENABLED | Modified: 2025-11-27
 */

import type { MemberRejectedData } from "../types";

export function memberRejectedTemplate(data: MemberRejectedData): string {
  const { orgName } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Access Request Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #374151; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Access Request Update</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for your interest in joining <strong>${orgName}</strong> on Greenlight PA.
    </p>

    <p style="font-size: 16px; margin: 20px 0;">
      Unfortunately, your access request has not been approved at this time. This may be because:
    </p>

    <ul style="font-size: 16px; margin: 20px 0; padding-left: 20px;">
      <li style="margin: 10px 0;">The organization is not currently accepting new members</li>
      <li style="margin: 10px 0;">Your request did not match their membership criteria</li>
      <li style="margin: 10px 0;">Additional verification is required</li>
    </ul>

    <p style="font-size: 16px; margin: 30px 0 20px 0;">
      If you believe this is an error or would like more information, please contact the organization administrator directly.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you have questions about this decision, please reach out to the organization directly.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">Greenlight PA - Prior Authorization Management System</p>
    <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}
