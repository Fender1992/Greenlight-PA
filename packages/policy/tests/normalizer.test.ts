/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Tests: Policy Normalizer | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { describe, it, expect } from "vitest";
import { normalizePolicy, validatePolicy } from "../normalizer";
import type { RawPolicy } from "../types";

describe("Policy Normalizer", () => {
  const mockRawPolicy: RawPolicy = {
    title: "MRI Brain - Prior Authorization Requirements",
    modality: "MRI Brain",
    url: "https://example.com/policies/mri-brain",
    rawHtml: "<html><body>Mock HTML</body></html>",
    rawText: `MRI Brain - Prior Authorization Policy

Effective Date: 2025-01-01

Requirements:
1. Clinical notes from last 3 months documenting persistent symptoms
2. Prior conservative treatment attempted (medication, physical therapy)
3. Diagnostic imaging reports (CT scan if available)

Approval Criteria:
- Patient must have documented neurological symptoms
- Conservative treatment attempted for at least 6 weeks
- No contraindications to MRI

CPT Codes: 70553, 70551, 70552

ICD-10 Codes: G89.29, R51, G44.1`,
    effectiveDate: "2025-01-01",
    metadata: {},
  };

  describe("normalizePolicy", () => {
    it("should normalize a valid policy", () => {
      const result = normalizePolicy(mockRawPolicy);

      expect(result.success).toBe(true);
      expect(result.normalized).toBeDefined();
      expect(result.normalized?.title).toBe(mockRawPolicy.title);
      expect(result.normalized?.modality).toBe(mockRawPolicy.modality);
    });

    it("should extract CPT codes", () => {
      const result = normalizePolicy(mockRawPolicy);

      expect(result.normalized?.cptCodes).toContain("70553");
      expect(result.normalized?.cptCodes).toContain("70551");
      expect(result.normalized?.cptCodes).toContain("70552");
    });

    it("should extract ICD-10 codes", () => {
      const result = normalizePolicy(mockRawPolicy);

      expect(result.normalized?.icd10Codes).toContain("G89.29");
      expect(result.normalized?.icd10Codes).toContain("R51");
      expect(result.normalized?.icd10Codes).toContain("G44.1");
    });

    it("should extract requirements", () => {
      const result = normalizePolicy(mockRawPolicy);

      expect(result.normalized?.requirements.length).toBeGreaterThan(0);
      expect(result.normalized?.requirements[0].requirement).toContain(
        "Clinical notes"
      );
    });

    it("should extract approval criteria", () => {
      const result = normalizePolicy(mockRawPolicy);

      expect(result.normalized?.approvalCriteria.length).toBeGreaterThan(0);
      expect(result.normalized?.approvalCriteria[0].criterion).toContain(
        "neurological symptoms"
      );
    });

    it("should warn if no CPT codes found", () => {
      const policyWithoutCPT: RawPolicy = {
        ...mockRawPolicy,
        rawText: "Policy text without CPT codes",
      };

      const result = normalizePolicy(policyWithoutCPT);

      expect(result.warnings).toContain("No CPT codes found in policy");
    });

    it("should warn if no requirements found", () => {
      const policyWithoutReqs: RawPolicy = {
        ...mockRawPolicy,
        rawText: "CPT Codes: 70553\n\nNo requirements here",
      };

      const result = normalizePolicy(policyWithoutReqs);

      expect(result.warnings).toContain("No requirements found in policy");
    });
  });

  describe("validatePolicy", () => {
    it("should validate a complete policy", () => {
      const result = normalizePolicy(mockRawPolicy);
      const validation = validatePolicy(result.normalized!);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("should fail if title is missing", () => {
      const result = normalizePolicy(mockRawPolicy);
      result.normalized!.title = "";

      const validation = validatePolicy(result.normalized!);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Policy title is required");
    });

    it("should fail if modality is missing", () => {
      const result = normalizePolicy(mockRawPolicy);
      result.normalized!.modality = "";

      const validation = validatePolicy(result.normalized!);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Policy modality is required");
    });

    it("should fail if no CPT codes", () => {
      const result = normalizePolicy(mockRawPolicy);
      result.normalized!.cptCodes = [];

      const validation = validatePolicy(result.normalized!);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("At least one CPT code is required");
    });

    it("should fail if no requirements", () => {
      const result = normalizePolicy(mockRawPolicy);
      result.normalized!.requirements = [];

      const validation = validatePolicy(result.normalized!);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "At least one requirement is required"
      );
    });
  });
});
