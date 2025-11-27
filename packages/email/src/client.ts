/**
 * Package: @greenlight/email/client | Status: ENABLED | Modified: 2025-11-27
 */

import { Resend } from "resend";
import type { EmailNotification } from "./types";
import {
  memberApprovedTemplate,
  memberRejectedTemplate,
  paStatusChangedTemplate,
  nameChangeApprovedTemplate,
  nameChangeDeniedTemplate,
} from "./templates";

let resendClient: Resend | null = null;

/**
 * Initialize the email client with API key
 * Returns null if no API key is configured
 */
function getEmailClient(): Resend | null {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[Email] RESEND_API_KEY not configured. Email notifications disabled."
    );
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send an email notification
 * Fails gracefully if email service is not configured
 */
export async function sendEmailNotification(
  notification: EmailNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getEmailClient();

    // If client is not configured, log and return success
    // This allows the app to work without email configured
    if (!client) {
      console.log(
        `[Email] Would send ${notification.type} email to ${notification.to} (disabled)`
      );
      return { success: true };
    }

    // Get the appropriate template
    let subject: string;
    let html: string;

    switch (notification.type) {
      case "member_approved":
        subject = "Welcome to Greenlight PA";
        html = memberApprovedTemplate(notification.data as any);
        break;
      case "member_rejected":
        subject = "Organization Access Request Update";
        html = memberRejectedTemplate(notification.data as any);
        break;
      case "pa_status_changed":
        subject = `PA Request Status Update: ${(notification.data as any).status}`;
        html = paStatusChangedTemplate(notification.data as any);
        break;
      case "name_change_approved":
        subject = "Name Change Request Approved";
        html = nameChangeApprovedTemplate(notification.data as any);
        break;
      case "name_change_denied":
        subject = "Name Change Request Update";
        html = nameChangeDeniedTemplate(notification.data as any);
        break;
      default:
        throw new Error(`Unknown notification type: ${notification.type}`);
    }

    // Send the email
    const result = await client.emails.send({
      from: process.env.EMAIL_FROM || "noreply@greenlight-pa.com",
      to: notification.to,
      subject,
      html,
    });

    if (result.error) {
      console.error(
        `[Email] Failed to send ${notification.type}:`,
        result.error
      );
      return { success: false, error: result.error.message };
    }

    console.log(
      `[Email] Successfully sent ${notification.type} to ${notification.to}`
    );
    return { success: true };
  } catch (error) {
    console.error(`[Email] Error sending notification:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send multiple email notifications in parallel
 */
export async function sendEmailNotifications(
  notifications: EmailNotification[]
): Promise<{ success: boolean; errors: string[] }> {
  const results = await Promise.all(
    notifications.map((n) => sendEmailNotification(n))
  );

  const errors = results
    .filter((r) => !r.success)
    .map((r) => r.error || "Unknown error");

  return {
    success: errors.length === 0,
    errors,
  };
}
