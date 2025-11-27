/**
 * Package: @greenlight/email/templates | Status: ENABLED | Modified: 2025-11-27
 */

import type { NameChangeApprovedData } from "../types";

export function nameChangeApprovedTemplate(
  data: NameChangeApprovedData
): string {
  const { orgName, newFirstName, newLastName, appUrl } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Name Change Request Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Name Change Approved</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Good news! Your name change request has been approved by the <strong>${orgName}</strong> administrator.
    </p>

    <div style="background: #d1fae5; padding: 20px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #059669;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #065f46;">Your New Name:</p>
      <p style="margin: 0; font-size: 24px; color: #065f46;">${newFirstName} ${newLastName}</p>
    </div>

    <p style="font-size: 16px; margin: 30px 0 20px 0;">
      Your profile has been updated with your new name. This change will be reflected across the platform immediately.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/settings" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        View Your Profile
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
