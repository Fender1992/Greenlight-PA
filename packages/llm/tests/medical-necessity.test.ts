/**
 * Tests for LLM Medical Necessity Generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateMedicalNecessity,
  type MedicalNecessityInput,
} from "../prompts/medical-necessity";

// Mock the CacheGPT client
vi.mock("../client", () => ({
  callCacheGPT: vi.fn(),
}));

describe("Medical Necessity Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInput: MedicalNecessityInput = {
    patient_demographics: {
      age: 58,
      sex: "F",
    },
    modality: "MRI Lumbar Spine",
    cpt_codes: ["72148"],
    icd10_codes: ["M54.5"],
    clinic_notes:
      "58-year-old female with chronic low back pain radiating to left lower extremity. Conservative management with PT and NSAIDs for 12 weeks without adequate relief. Positive straight leg raise on left.",
    prior_imaging_summary: "X-ray lumbar spine 6 months ago showed mild DJD",
    policy_criteria: [
      "Failed conservative therapy for 6-12 weeks",
      "Progressive neurological symptoms",
    ],
  };

  it("should generate medical necessity summary", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "The patient is a 58-year-old female presenting with chronic low back pain (ICD-10: M54.5) radiating to the left lower extremity. Conservative management including physical therapy and NSAIDs over the past 12 weeks has not provided adequate relief. Clinical examination reveals positive straight leg raise test on the left with decreased sensation in the L5 distribution. MRI of the lumbar spine is medically necessary to evaluate for disc herniation or spinal stenosis that may be amenable to interventional treatment.",
        indications_text:
          "Clinical indications include chronic low back pain with radicular symptoms, failed conservative therapy for 12 weeks, and positive physical examination findings suggesting nerve root compression. Prior imaging shows degenerative joint disease which may have progressed.",
        risk_benefit_text:
          "MRI is the optimal imaging modality for evaluating soft tissue structures including intervertebral discs and nerve roots. It provides superior visualization compared to X-ray and avoids radiation exposure. The diagnostic information will guide treatment decisions including potential surgical intervention.",
      }),
      error: null,
      model: "claude-sonnet-4-5-20250929",
      usage: { input_tokens: 600, output_tokens: 300 },
    });

    const result = await generateMedicalNecessity(mockInput);

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.data?.medical_necessity_text).toContain("58-year-old");
    expect(result.data?.indications_text).toContain("chronic low back pain");
    expect(result.data?.risk_benefit_text).toContain("MRI");
  });

  it("should include patient demographics in prompt", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    await generateMedicalNecessity(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("58yo");
    expect(callArgs.messages[0].content).toContain("F");
  });

  it("should include modality and codes in prompt", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    await generateMedicalNecessity(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("MRI Lumbar Spine");
    expect(callArgs.messages[0].content).toContain("72148");
    expect(callArgs.messages[0].content).toContain("M54.5");
  });

  it("should include clinic notes in prompt", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    await generateMedicalNecessity(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("chronic low back pain");
    expect(callArgs.messages[0].content).toContain("Positive straight leg");
  });

  it("should include prior imaging when provided", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    await generateMedicalNecessity(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("Prior Imaging");
    expect(callArgs.messages[0].content).toContain("X-ray lumbar spine");
  });

  it("should include policy criteria when provided", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    await generateMedicalNecessity(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("Payer Policy Criteria");
    expect(callArgs.messages[0].content).toContain(
      "Failed conservative therapy"
    );
    expect(callArgs.messages[0].content).toContain("neurological symptoms");
  });

  it("should use temperature of 0.5 for balanced output", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    await generateMedicalNecessity(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.temperature).toBe(0.5);
  });

  it("should handle LLM API errors", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: false,
      data: null,
      error: "API rate limit exceeded",
    });

    const result = await generateMedicalNecessity(mockInput);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("should handle invalid JSON responses", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: "This is not valid JSON",
      error: null,
    });

    const result = await generateMedicalNecessity(mockInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("parse");
  });

  it("should handle responses missing required fields", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text: "Some text",
        // Missing indications_text and risk_benefit_text
      }),
      error: null,
    });

    const result = await generateMedicalNecessity(mockInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing required fields");
  });

  it("should reject medical necessity text that is too short", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text: "Too short",
        indications_text: "Indications",
        risk_benefit_text: "Risk benefit",
      }),
      error: null,
    });

    const result = await generateMedicalNecessity(mockInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("too short");
  });

  it("should extract JSON from response with surrounding text", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: `Here is the medical necessity summary:

{
  "medical_necessity_text": "The patient is a 58-year-old female presenting with chronic low back pain (ICD-10: M54.5) radiating to the left lower extremity. Conservative management has failed to provide adequate relief.",
  "indications_text": "Clinical indications include chronic low back pain with radicular symptoms.",
  "risk_benefit_text": "MRI is the optimal imaging modality for this clinical presentation."
}

This should help with the PA request.`,
      error: null,
    });

    const result = await generateMedicalNecessity(mockInput);

    expect(result.success).toBe(true);
    expect(result.data?.medical_necessity_text).toContain("58-year-old");
  });

  it("should handle minimal patient demographics", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    const minimalInput: MedicalNecessityInput = {
      patient_demographics: {},
      modality: "CT Chest",
      cpt_codes: ["71260"],
      icd10_codes: ["J18.9"],
      clinic_notes: "Suspected pneumonia",
    };

    await generateMedicalNecessity(minimalInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("Adult patient");
  });

  it("should work without optional fields", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    const minimalInput: MedicalNecessityInput = {
      patient_demographics: { age: 45 },
      modality: "MRI Brain",
      cpt_codes: ["70551"],
      icd10_codes: ["G43.909"],
      clinic_notes: "Chronic migraines",
      // No prior_imaging_summary or policy_criteria
    };

    const result = await generateMedicalNecessity(minimalInput);

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
  });

  it("should pass system prompt with detailed instructions", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
    });

    await generateMedicalNecessity(mockInput);

    const callArgs = vi.mocked(callCacheGPT).mock.calls[0][0];
    expect(callArgs.system).toContain("medical documentation specialist");
    expect(callArgs.system).toContain("medical necessity");
    expect(callArgs.system).toContain("clinical indications");
    expect(callArgs.system).toContain("risk/benefit");
  });

  it("should return model and usage information on success", async () => {
    const { callCacheGPT } = await import("../client");

    vi.mocked(callCacheGPT).mockResolvedValue({
      success: true,
      data: JSON.stringify({
        medical_necessity_text:
          "Medical necessity narrative with sufficient length to pass validation test. This text demonstrates the clinical need for the procedure based on patient presentation and clinical findings.",
        indications_text: "Clinical indications summary",
        risk_benefit_text: "Risk benefit analysis",
      }),
      error: null,
      model: "claude-sonnet-4-5-20250929",
      usage: { input_tokens: 500, output_tokens: 250 },
    });

    const result = await generateMedicalNecessity(mockInput);

    expect(result.success).toBe(true);
    expect(result.model).toBe("claude-sonnet-4-5-20250929");
    expect(result.usage).toEqual({ input_tokens: 500, output_tokens: 250 });
  });
});
