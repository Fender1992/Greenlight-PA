/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/policy | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

// Types
export type {
  PolicyDocument,
  PolicyContent,
  PolicySection,
  PolicyRequirement,
  ApprovalCriteria,
  ScraperConfig,
  ScraperResult,
  RawPolicy,
  NormalizationOptions,
  NormalizationResult,
  IngestionJob,
  IngestionResult,
  PolicySnippet,
  PolicyChange,
  PolicyDiff,
} from "./types";

// Scraper
export { scrapePolicies, RateLimiter } from "./scraper";

// Normalizer
export { normalizePolicy, validatePolicy } from "./normalizer";

// Ingestion
export {
  ingestPoliciesForPayer,
  storePolicySnippets,
  updatePolicySnippets,
  detectPolicyChanges,
} from "./ingestion";
