/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/policy/normalizer | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import type {
  RawPolicy,
  PolicyContent,
  PolicyRequirement,
  ApprovalCriteria,
  NormalizationResult,
  NormalizationOptions,
  PolicySection,
} from "./types";

/**
 * Policy Normalizer
 *
 * Converts raw scraped policy text into structured PolicyContent
 */

/**
 * Normalize a raw policy into structured content
 */
export function normalizePolicy(
  rawPolicy: RawPolicy,
  options: NormalizationOptions = {}
): NormalizationResult {
  const warnings: string[] = [];

  try {
    // Extract title and modality
    const title = rawPolicy.title || "Untitled Policy";
    const modality =
      rawPolicy.modality || extractModalityFromText(rawPolicy.rawText);

    if (!modality) {
      warnings.push("Could not extract modality from policy");
    }

    // Extract CPT codes
    const cptCodes =
      options.extractCPTCodes !== false
        ? extractCPTCodes(rawPolicy.rawText)
        : [];

    if (cptCodes.length === 0) {
      warnings.push("No CPT codes found in policy");
    }

    // Extract ICD-10 codes
    const icd10Codes =
      options.extractICD10Codes !== false
        ? extractICD10Codes(rawPolicy.rawText)
        : [];

    // Extract requirements
    const requirements =
      options.identifyRequirements !== false
        ? extractRequirements(rawPolicy.rawText)
        : [];

    if (requirements.length === 0) {
      warnings.push("No requirements found in policy");
    }

    // Extract approval criteria
    const approvalCriteria =
      options.identifyApprovalCriteria !== false
        ? extractApprovalCriteria(rawPolicy.rawText)
        : [];

    // Extract sections
    const sections = extractSections(rawPolicy.rawText);

    // Extract denial reasons
    const denialReasons = extractDenialReasons(rawPolicy.rawText);

    const normalized: PolicyContent = {
      title,
      modality,
      cptCodes,
      icd10Codes,
      sections,
      requirements,
      approvalCriteria,
      denialReasons,
    };

    return {
      success: true,
      normalized,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      normalized: null,
      warnings,
      error: error instanceof Error ? error.message : "Normalization failed",
    };
  }
}

/**
 * Extract modality from policy text
 */
function extractModalityFromText(text: string): string {
  // Look for common patterns
  const modalityPatterns = [
    /(?:MRI|CT|PET|X-Ray|Ultrasound|Nuclear)\s+(?:of\s+)?(?:the\s+)?(\w+(?:\s+\w+)?)/gi,
    /(\w+(?:\s+\w+)?)\s+(?:MRI|CT|PET|X-Ray|Ultrasound)/gi,
  ];

  for (const pattern of modalityPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      return match[0].trim();
    }
  }

  return "";
}

/**
 * Extract CPT codes from text
 */
function extractCPTCodes(text: string): string[] {
  // CPT codes are 5-digit numbers
  const cptPattern = /(?:CPT|Code)s?:?\s*(\d{5}(?:\s*,\s*\d{5})*)/gi;
  const directPattern = /\b(\d{5})\b/g;

  const codes = new Set<string>();

  // Look for explicitly labeled CPT codes
  let match;
  while ((match = cptPattern.exec(text)) !== null) {
    const foundCodes = match[1].split(/,\s*/).map((c) => c.trim());
    foundCodes.forEach((code) => codes.add(code));
  }

  // If no labeled codes found, look for 5-digit numbers in context
  if (codes.size === 0) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.toLowerCase().includes("cpt")) {
        while ((match = directPattern.exec(line)) !== null) {
          codes.add(match[1]);
        }
      }
    }
  }

  return Array.from(codes);
}

/**
 * Extract ICD-10 codes from text
 */
function extractICD10Codes(text: string): string[] {
  // ICD-10 codes: Letter followed by 2-3 digits, optionally followed by . and 1-4 alphanumeric
  const icd10Pattern = /\b([A-Z]\d{2}(?:\.\d{1,4})?|\*)\b/g;
  const labeledPattern =
    /(?:ICD-10|ICD|Diagnosis)(?:\s+Code)?s?:?\s*([A-Z]\d{2}(?:\.\d{1,4})?(?:\s*,\s*[A-Z]\d{2}(?:\.\d{1,4})?)*)/gi;

  const codes = new Set<string>();

  // Look for explicitly labeled ICD-10 codes
  let match;
  while ((match = labeledPattern.exec(text)) !== null) {
    const foundCodes = match[1].split(/,\s*/).map((c) => c.trim());
    foundCodes.forEach((code) => {
      if (code !== "*") {
        codes.add(code);
      }
    });
  }

  // If no labeled codes found, look in context
  if (codes.size === 0) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (
        line.toLowerCase().includes("icd") ||
        line.toLowerCase().includes("diagnosis")
      ) {
        while ((match = icd10Pattern.exec(line)) !== null) {
          if (match[1] !== "*") {
            codes.add(match[1]);
          }
        }
      }
    }
  }

  return Array.from(codes);
}

/**
 * Extract requirements from text
 */
function extractRequirements(text: string): PolicyRequirement[] {
  const requirements: PolicyRequirement[] = [];
  const lines = text.split("\n");

  let inRequirementsSection = false;
  let requirementIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect requirements section
    if (/^(?:Requirements?|Documentation|Needed|Required):?$/i.test(trimmed)) {
      inRequirementsSection = true;
      continue;
    }

    // Exit requirements section
    if (
      inRequirementsSection &&
      /^(?:Approval|Criteria|Denial|Notes?|CPT|ICD):?/i.test(trimmed)
    ) {
      inRequirementsSection = false;
    }

    // Extract numbered or bulleted requirements
    if (inRequirementsSection) {
      const match = trimmed.match(/^(?:\d+\.|[-•*])\s+(.+)$/);
      if (match) {
        requirements.push({
          id: `req-${requirementIndex++}`,
          requirement: match[1].trim(),
          category: categorizeRequirement(match[1]),
          mandatory: !match[1].toLowerCase().includes("optional"),
        });
      }
    }
  }

  return requirements;
}

/**
 * Categorize a requirement
 */
function categorizeRequirement(text: string): PolicyRequirement["category"] {
  const lower = text.toLowerCase();

  if (
    lower.includes("clinical notes") ||
    lower.includes("documentation") ||
    lower.includes("records")
  ) {
    return "clinical_documentation";
  }

  if (
    lower.includes("prior treatment") ||
    lower.includes("conservative") ||
    lower.includes("attempted")
  ) {
    return "prior_treatment";
  }

  if (
    lower.includes("imaging") ||
    lower.includes("x-ray") ||
    lower.includes("test") ||
    lower.includes("lab")
  ) {
    return "diagnostic_testing";
  }

  if (
    lower.includes("provider") ||
    lower.includes("specialist") ||
    lower.includes("physician")
  ) {
    return "provider_qualification";
  }

  return "other";
}

/**
 * Extract approval criteria from text
 */
function extractApprovalCriteria(text: string): ApprovalCriteria[] {
  const criteria: ApprovalCriteria[] = [];
  const lines = text.split("\n");

  let inCriteriaSection = false;
  let criterionIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect criteria section
    if (/^(?:Approval Criteria|Indications?|Criteria):?$/i.test(trimmed)) {
      inCriteriaSection = true;
      continue;
    }

    // Exit criteria section
    if (
      inCriteriaSection &&
      /^(?:Denial|Requirements?|CPT|ICD|Notes?):?/i.test(trimmed)
    ) {
      inCriteriaSection = false;
    }

    // Extract numbered or bulleted criteria
    if (inCriteriaSection) {
      const match = trimmed.match(/^(?:\d+\.|[-•*])\s+(.+)$/);
      if (match) {
        const criterion = match[1].trim();
        criteria.push({
          id: `criteria-${criterionIndex++}`,
          criterion,
          type: determineCriteriaType(criterion),
        });
      }
    }
  }

  return criteria;
}

/**
 * Determine criteria type
 */
function determineCriteriaType(text: string): ApprovalCriteria["type"] {
  const lower = text.toLowerCase();

  if (lower.includes("must") || lower.includes("required")) {
    return "must_meet";
  }

  if (lower.includes("should") || lower.includes("preferred")) {
    return "should_meet";
  }

  if (lower.includes("or") || lower.includes("alternative")) {
    return "alternative";
  }

  return "must_meet"; // Default to must_meet
}

/**
 * Extract sections from text
 */
function extractSections(text: string): PolicySection[] {
  const sections: PolicySection[] = [];
  const lines = text.split("\n");

  let currentSection: PolicySection | null = null;
  let sectionIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers (lines ending with : or all caps)
    if (
      trimmed.endsWith(":") ||
      (trimmed === trimmed.toUpperCase() && trimmed.length > 3)
    ) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        id: `section-${sectionIndex++}`,
        title: trimmed.replace(/:$/, ""),
        content: "",
        order: sectionIndex,
      };
    } else if (currentSection && trimmed.length > 0) {
      // Add content to current section
      currentSection.content += trimmed + "\n";
    }
  }

  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract denial reasons from text
 */
function extractDenialReasons(text: string): string[] {
  const reasons: string[] = [];
  const lines = text.split("\n");

  let inDenialSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect denial section
    if (/^(?:Denial Reasons?|Not Approved|Exclusions?):?$/i.test(trimmed)) {
      inDenialSection = true;
      continue;
    }

    // Exit denial section
    if (
      inDenialSection &&
      /^(?:Approval|Requirements?|CPT|ICD|Notes?):?/i.test(trimmed)
    ) {
      inDenialSection = false;
    }

    // Extract numbered or bulleted reasons
    if (inDenialSection) {
      const match = trimmed.match(/^(?:\d+\.|[-•*])\s+(.+)$/);
      if (match) {
        reasons.push(match[1].trim());
      }
    }
  }

  return reasons;
}

/**
 * Validate normalized policy
 */
export function validatePolicy(policy: PolicyContent): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!policy.title || policy.title.trim().length === 0) {
    errors.push("Policy title is required");
  }

  if (!policy.modality || policy.modality.trim().length === 0) {
    errors.push("Policy modality is required");
  }

  if (policy.cptCodes.length === 0) {
    errors.push("At least one CPT code is required");
  }

  if (policy.requirements.length === 0) {
    errors.push("At least one requirement is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
