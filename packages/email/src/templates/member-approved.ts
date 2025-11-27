/**
 * Package: @greenlight/email/templates | Status: ENABLED | Modified: 2025-11-27
 */

import type { MemberApprovedData } from "../types";

export function memberApprovedTemplate(data: MemberApprovedData): string {
  const { orgName, role, appUrl } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Greenlight PA</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Greenlight PA</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your access request has been approved.
    </p>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; font-weight: 600;">Organization:</p>
      <p style="margin: 0 0 20px 0; font-size: 18px;">${orgName}</p>

      <p style="margin: 0 0 10px 0; font-weight: 600;">Your Role:</p>
      <p style="margin: 0; font-size: 18px; text-transform: capitalize;">${role}</p>
    </div>

    <p style="font-size: 16px; margin: 30px 0 20px 0;">
      You can now access the platform and start managing prior authorization requests.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Access Dashboard
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you have any questions, please contact your organization administrator.
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
