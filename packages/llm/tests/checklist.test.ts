/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Test: LLM Checklist Generation | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateChecklist,
  type ChecklistGenerationInput,
} from "../prompts/checklist";

// Mock the CacheGPT client
vi.mock("../client", () => {
  const mockFn = vi.fn();
  return {
    callCacheGPT: mockFn,
    callClaude: mockFn, // Backwards compatibility alias
  };
});

describe("Checklist Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInput: ChecklistGenerationInput = {
    modality: "MRI Brain",
    cpt_codes: ["70551"],
    icd10_codes: ["G89.29"],
    payer_name: "Blue Cross",
    policy_snippets: [
      "Prior imaging reports required within 12 months",
      "Clinical notes must document medical necessity",
    ],
  };

  it("should generate checklist items", async () => {
    const { callCacheGPT } = await import("../client");

    // Mock successful LLM response
    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify([
        {
          name: "Prior imaging reports from last 12 months",
          rationale:
            "Payer requires documentation of previous imaging (Policy Section 4.2)",
          required_bool: true,
        },
        {
          name: "Clinical notes from ordering provider",
          rationale: "Provider notes must document clinical indication",
          required_bool: true,
        },
      ]),
      error: null,
      model: "claude-3-5-sonnet-20241022",
      usage: { input_tokens: 500, output_tokens: 200 },
    });

    const result = await generateChecklist(mockInput);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).toMatchObject({
      name: expect.any(String),
      rationale: expect.any(String),
      required_bool: expect.any(Boolean),
    });
  });

  it("should handle LLM API errors", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: false,
      data: null,
      error: "API rate limit exceeded",
    });

    const result = await generateChecklist(mockInput);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("should handle invalid JSON responses", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: "This is not valid JSON",
      error: null,
    });

    const result = await generateChecklist(mockInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("parse");
  });

  it("should include policy snippets in prompt", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: "[]",
      error: null,
    });

    await generateChecklist(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain(
      "Prior imaging reports required"
    );
  });
});
