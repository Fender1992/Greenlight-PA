/**
 * Package: @greenlight/email/types | Status: ENABLED | Modified: 2025-11-27
 */

export type EmailNotificationType =
  | "member_approved"
  | "member_rejected"
  | "pa_status_changed"
  | "name_change_approved"
  | "name_change_denied";

export interface EmailNotification {
  to: string;
  type: EmailNotificationType;
  data: Record<string, any>;
}

export interface MemberApprovedData {
  orgName: string;
  role: string;
  appUrl: string;
}

export interface MemberRejectedData {
  orgName: string;
}

export interface PaStatusChangedData {
  patientName: string;
  orderId: string;
  status: string;
  note?: string;
  paRequestId: string;
  appUrl: string;
}

export interface NameChangeApprovedData {
  orgName: string;
  newFirstName: string;
  newLastName: string;
  appUrl: string;
}

export interface NameChangeDeniedData {
  orgName: string;
  denialReason: string;
  appUrl: string;
}
