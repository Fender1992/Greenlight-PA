/**
 * Package: @greenlight/email/templates | Status: ENABLED | Modified: 2025-11-27
 */

import type { PaStatusChangedData } from "../types";

export function paStatusChangedTemplate(data: PaStatusChangedData): string {
  const { patientName, orderId, status, note, paRequestId, appUrl } = data;

  // Map status to user-friendly text and colors
  const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = {
    draft: {
      label: "Draft",
      color: "#6b7280",
      bgColor: "#f3f4f6",
    },
    submitted: {
      label: "Submitted",
      color: "#2563eb",
      bgColor: "#dbeafe",
    },
    pending_info: {
      label: "Pending Information",
      color: "#f59e0b",
      bgColor: "#fef3c7",
    },
    approved: {
      label: "Approved",
      color: "#059669",
      bgColor: "#d1fae5",
    },
    denied: {
      label: "Denied",
      color: "#dc2626",
      bgColor: "#fee2e2",
    },
    appealed: {
      label: "Appealed",
      color: "#7c3aed",
      bgColor: "#ede9fe",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;
  const paUrl = `${appUrl}/pa-requests/${paRequestId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PA Request Status Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">PA Request Status Update</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 30px;">
      A prior authorization request has been updated:
    </p>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; font-weight: 600;">Patient:</p>
      <p style="margin: 0 0 20px 0; font-size: 18px;">${patientName}</p>

      <p style="margin: 0 0 10px 0; font-weight: 600;">Order ID:</p>
      <p style="margin: 0 0 20px 0; font-size: 16px; font-family: monospace;">${orderId.substring(0, 8)}</p>

      <p style="margin: 0 0 10px 0; font-weight: 600;">New Status:</p>
      <div style="display: inline-block; padding: 8px 16px; border-radius: 6px; background: ${config.bgColor}; color: ${config.color}; font-weight: 600; font-size: 16px;">
        ${config.label}
      </div>
    </div>

    ${
      note
        ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">Note:</p>
      <p style="margin: 0; color: #92400e;">${note}</p>
    </div>
    `
        : ""
    }

    <p style="font-size: 16px; margin: 30px 0 20px 0;">
      Click below to view the full details and take any necessary action:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${paUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        View PA Request
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      You're receiving this email because you're associated with this PA request.
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
