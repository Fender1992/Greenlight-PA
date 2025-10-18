import type { Database } from "@greenlight/db/types/database";

export type Db = Database;

export type PatientRow = Db["public"]["Tables"]["patient"]["Row"];
export type OrderRow = Db["public"]["Tables"]["order"]["Row"];
export type ProviderRow = Db["public"]["Tables"]["provider"]["Row"];
export type PayerRow = Db["public"]["Tables"]["payer"]["Row"];
export type OrgRow = Db["public"]["Tables"]["org"]["Row"];
export type PaRequestRow = Db["public"]["Tables"]["pa_request"]["Row"];
export type ChecklistItemRow =
  Db["public"]["Tables"]["pa_checklist_item"]["Row"];
export type PaSummaryRow = Db["public"]["Tables"]["pa_summary"]["Row"];
export type StatusEventRow = Db["public"]["Tables"]["status_event"]["Row"];
export type AuditLogRow = Db["public"]["Tables"]["audit_log"]["Row"];
export type AttachmentRow = Db["public"]["Tables"]["attachment"]["Row"];
export type PolicySnippetRow = Db["public"]["Tables"]["policy_snippet"]["Row"];

export type OrderWithRelations = OrderRow & {
  patient: PatientRow | null;
  provider: ProviderRow | null;
};

export type ChecklistItemWithAttachment = ChecklistItemRow & {
  evidence_attachment?: AttachmentRow | null;
};

export type PaRequestWithRelations = PaRequestRow & {
  order: OrderWithRelations | null;
  payer: PayerRow | null;
  checklist_items?: ChecklistItemWithAttachment[] | null;
  summaries?: PaSummaryRow[] | null;
  status_events?: StatusEventRow[] | null;
  attachments?: AttachmentRow[] | null;
  policy_snippets?: PolicySnippetRow[] | null;
};

export interface MetricsResponse {
  overall: {
    totalRequests: number;
    approvalRate: number;
    avgTurnaroundDays: number;
    urgentRequests: number;
  };
  byStatus: Record<string, number>;
  payerCounts: Record<string, number>;
  trends: Array<{
    month: string;
    requests: number;
    approvalRate: number;
  }>;
}

export interface AuditLogResponse {
  success: boolean;
  error?: string;
  data: AuditLogRow[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
