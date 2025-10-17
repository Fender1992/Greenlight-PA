/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/policy/types | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

/**
 * Policy Document Types
 */

export interface PolicyDocument {
  id: string;
  payerId: string;
  payerName: string;
  modality: string;
  effectiveDate: string;
  expirationDate?: string;
  sourceUrl: string;
  rawContent: string;
  normalizedContent: PolicyContent;
  version: string;
  lastUpdated: string;
  status: "active" | "expired" | "superseded";
}

export interface PolicyContent {
  title: string;
  modality: string;
  cptCodes: string[];
  icd10Codes?: string[];
  sections: PolicySection[];
  requirements: PolicyRequirement[];
  approvalCriteria: ApprovalCriteria[];
  denialReasons?: string[];
  notes?: string;
}

export interface PolicySection {
  id: string;
  title: string;
  content: string;
  subsections?: PolicySection[];
  order: number;
}

export interface PolicyRequirement {
  id: string;
  requirement: string;
  category:
    | "clinical_documentation"
    | "prior_treatment"
    | "diagnostic_testing"
    | "provider_qualification"
    | "other";
  mandatory: boolean;
  details?: string;
}

export interface ApprovalCriteria {
  id: string;
  criterion: string;
  type: "must_meet" | "should_meet" | "alternative";
  details?: string;
}

/**
 * Policy Scraper Types
 */

export interface ScraperConfig {
  payerId: string;
  payerName: string;
  baseUrl: string;
  selectors: {
    policyList?: string;
    policyDocument?: string;
    title?: string;
    content?: string;
    effectiveDate?: string;
  };
  headers?: Record<string, string>;
  rateLimit?: {
    requestsPerMinute: number;
    delayMs: number;
  };
}

export interface ScraperResult {
  success: boolean;
  policies: RawPolicy[];
  errors: string[];
  scrapedAt: string;
}

export interface RawPolicy {
  title: string;
  modality: string;
  url: string;
  rawHtml: string;
  rawText: string;
  effectiveDate?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Policy Normalization Types
 */

export interface NormalizationOptions {
  extractCPTCodes?: boolean;
  extractICD10Codes?: boolean;
  identifyRequirements?: boolean;
  identifyApprovalCriteria?: boolean;
  removeDuplicates?: boolean;
}

export interface NormalizationResult {
  success: boolean;
  normalized: PolicyContent | null;
  warnings: string[];
  error?: string;
}

/**
 * Policy Ingestion Types
 */

export interface IngestionJob {
  id: string;
  payerId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  policiesFound: number;
  policiesIngested: number;
  errors: string[];
}

export interface IngestionResult {
  success: boolean;
  jobId: string;
  policiesIngested: number;
  errors: string[];
}

/**
 * Policy Snippet (for database storage)
 */

export interface PolicySnippet {
  id: string;
  payerId: string;
  modality: string;
  requirement: string;
  rationale?: string;
  effectiveDate: string;
  expirationDate?: string;
  cptCodes?: string[];
  icd10Codes?: string[];
  sourceUrl?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Policy Change Tracking
 */

export interface PolicyChange {
  id: string;
  policyId: string;
  changeType: "created" | "updated" | "expired" | "superseded";
  previousVersion?: string;
  newVersion: string;
  changes: PolicyDiff[];
  detectedAt: string;
  notified: boolean;
}

export interface PolicyDiff {
  field: string;
  type: "added" | "removed" | "modified";
  oldValue?: string;
  newValue?: string;
  impact: "high" | "medium" | "low";
}
