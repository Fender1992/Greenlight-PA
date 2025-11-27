/**
 * Package: @greenlight/email | Status: ENABLED | Modified: 2025-11-27
 *
 * Email notification service for Greenlight PA
 * Supports member approval/rejection, PA status changes, and name change requests
 */

export { sendEmailNotification, sendEmailNotifications } from "./client";
export type {
  EmailNotification,
  EmailNotificationType,
  MemberApprovedData,
  MemberRejectedData,
  PaStatusChangedData,
  NameChangeApprovedData,
  NameChangeDeniedData,
} from "./types";
