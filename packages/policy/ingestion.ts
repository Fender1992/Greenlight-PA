/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/policy/ingestion | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { scrapePolicies } from "./scraper";
import { normalizePolicy, validatePolicy } from "./normalizer";
import type {
  ScraperConfig,
  IngestionResult,
  PolicySnippet,
  PolicyContent,
  PolicyDocument,
} from "./types";

/**
 * Policy Ingestion Pipeline
 *
 * Coordinates scraping, normalization, and storage of policy documents
 */

/**
 * Ingest policies for a specific payer
 */
export async function ingestPoliciesForPayer(
  payerId: string,
  config: ScraperConfig
): Promise<IngestionResult> {
  const jobId = `job-${Date.now()}-${payerId}`;
  const errors: string[] = [];
  let policiesIngested = 0;

  try {
    console.log(`[Ingestion] Starting job ${jobId} for payer ${payerId}`);

    // Step 1: Scrape policies
    const scraperResult = await scrapePolicies(config);

    if (!scraperResult.success) {
      errors.push(...scraperResult.errors);
      return {
        success: false,
        jobId,
        policiesIngested: 0,
        errors,
      };
    }

    console.log(
      `[Ingestion] Scraped ${scraperResult.policies.length} policies`
    );

    // Step 2: Normalize each policy
    for (const rawPolicy of scraperResult.policies) {
      try {
        const normalizationResult = normalizePolicy(rawPolicy, {
          extractCPTCodes: true,
          extractICD10Codes: true,
          identifyRequirements: true,
          identifyApprovalCriteria: true,
        });

        if (!normalizationResult.success || !normalizationResult.normalized) {
          errors.push(
            `Failed to normalize policy: ${rawPolicy.title} - ${normalizationResult.error}`
          );
          continue;
        }

        // Log warnings
        if (normalizationResult.warnings.length > 0) {
          console.warn(
            `[Ingestion] Warnings for ${rawPolicy.title}:`,
            normalizationResult.warnings
          );
        }

        // Step 3: Validate normalized policy
        const validation = validatePolicy(normalizationResult.normalized);
        if (!validation.valid) {
          errors.push(
            `Policy validation failed: ${rawPolicy.title} - ${validation.errors.join(", ")}`
          );
          continue;
        }

        // Step 4: Convert to policy document
        const policyDocument = createPolicyDocument(
          payerId,
          config.payerName,
          rawPolicy.url,
          rawPolicy.rawText,
          normalizationResult.normalized
        );

        // Step 5: Extract policy snippets for database
        const snippets = extractPolicySnippets(
          policyDocument,
          normalizationResult.normalized
        );

        // Step 6: Store in database (placeholder)
        // In production, this would call Supabase to insert policy_snippet records
        console.log(
          `[Ingestion] Would store ${snippets.length} snippets for ${rawPolicy.title}`
        );
        policiesIngested++;
      } catch (error) {
        errors.push(
          `Error processing policy ${rawPolicy.title}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    console.log(
      `[Ingestion] Job ${jobId} complete. Ingested ${policiesIngested}/${scraperResult.policies.length} policies`
    );

    return {
      success: true,
      jobId,
      policiesIngested,
      errors,
    };
  } catch (error) {
    errors.push(
      `Ingestion job failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return {
      success: false,
      jobId,
      policiesIngested,
      errors,
    };
  }
}

/**
 * Create a policy document from normalized content
 */
function createPolicyDocument(
  payerId: string,
  payerName: string,
  sourceUrl: string,
  rawContent: string,
  normalizedContent: PolicyContent
): PolicyDocument {
  const now = new Date().toISOString();

  return {
    id: `policy-${Date.now()}-${payerId}`,
    payerId,
    payerName,
    modality: normalizedContent.modality,
    effectiveDate: now,
    sourceUrl,
    rawContent,
    normalizedContent,
    version: "1.0",
    lastUpdated: now,
    status: "active",
  };
}

/**
 * Extract policy snippets from normalized policy content
 * These are stored in the database as individual requirements
 */
function extractPolicySnippets(
  document: PolicyDocument,
  content: PolicyContent
): PolicySnippet[] {
  const snippets: PolicySnippet[] = [];
  const now = new Date().toISOString();

  // Create a snippet for each requirement
  for (const requirement of content.requirements) {
    snippets.push({
      id: `snippet-${Date.now()}-${requirement.id}`,
      payerId: document.payerId,
      modality: content.modality,
      requirement: requirement.requirement,
      rationale: requirement.details,
      effectiveDate: document.effectiveDate,
      expirationDate: document.expirationDate,
      cptCodes: content.cptCodes,
      icd10Codes: content.icd10Codes,
      sourceUrl: document.sourceUrl,
      version: document.version,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Create snippets for approval criteria
  for (const criterion of content.approvalCriteria) {
    snippets.push({
      id: `snippet-${Date.now()}-${criterion.id}`,
      payerId: document.payerId,
      modality: content.modality,
      requirement: criterion.criterion,
      rationale: criterion.details,
      effectiveDate: document.effectiveDate,
      expirationDate: document.expirationDate,
      cptCodes: content.cptCodes,
      icd10Codes: content.icd10Codes,
      sourceUrl: document.sourceUrl,
      version: document.version,
      createdAt: now,
      updatedAt: now,
    });
  }

  return snippets;
}

/**
 * Store policy snippets in database
 * (Placeholder - would use Supabase in production)
 */
export async function storePolicySnippets(
  snippets: PolicySnippet[]
): Promise<{ success: boolean; stored: number; errors: string[] }> {
  // TODO: Implement Supabase integration
  // const { data, error } = await supabase
  //   .from('policy_snippet')
  //   .insert(snippets);

  console.log(
    `[Ingestion] Would store ${snippets.length} policy snippets in database`
  );

  return {
    success: true,
    stored: snippets.length,
    errors: [],
  };
}

/**
 * Update existing policy snippets with new versions
 */
export async function updatePolicySnippets(
  payerId: string,
  modality: string,
  newSnippets: PolicySnippet[]
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  // TODO: Implement version management
  // 1. Fetch existing snippets for payer + modality
  // 2. Compare with new snippets
  // 3. Mark old snippets as expired
  // 4. Insert new snippets with incremented version

  console.log(
    `[Ingestion] Would update policy snippets for ${payerId} - ${modality}`
  );

  return {
    success: true,
    updated: newSnippets.length,
    errors: [],
  };
}

/**
 * Detect policy changes
 */
export function detectPolicyChanges(
  oldPolicy: PolicyContent,
  newPolicy: PolicyContent
): {
  hasChanges: boolean;
  changes: Array<{
    field: string;
    type: "added" | "removed" | "modified";
    oldValue?: string;
    newValue?: string;
  }>;
} {
  const changes: Array<{
    field: string;
    type: "added" | "removed" | "modified";
    oldValue?: string;
    newValue?: string;
  }> = [];

  // Compare CPT codes
  const oldCPT = new Set(oldPolicy.cptCodes);
  const newCPT = new Set(newPolicy.cptCodes);

  for (const code of Array.from(newCPT)) {
    if (!oldCPT.has(code)) {
      changes.push({
        field: "cptCodes",
        type: "added",
        newValue: code,
      });
    }
  }

  for (const code of Array.from(oldCPT)) {
    if (!newCPT.has(code)) {
      changes.push({
        field: "cptCodes",
        type: "removed",
        oldValue: code,
      });
    }
  }

  // Compare requirements count (simplified)
  if (oldPolicy.requirements.length !== newPolicy.requirements.length) {
    changes.push({
      field: "requirements",
      type: "modified",
      oldValue: `${oldPolicy.requirements.length} requirements`,
      newValue: `${newPolicy.requirements.length} requirements`,
    });
  }

  return {
    hasChanges: changes.length > 0,
    changes,
  };
}
