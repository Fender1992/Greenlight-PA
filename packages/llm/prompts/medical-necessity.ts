/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/llm/prompts/medical-necessity | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { callCacheGPT, type LLMResponse } from "../client";

/**
 * Medical Necessity Summary
 */
export interface MedicalNecessitySummary {
  medical_necessity_text: string;
  indications_text: string;
  risk_benefit_text: string;
}

/**
 * Input data for medical necessity generation
 */
export interface MedicalNecessityInput {
  patient_demographics: {
    age?: number;
    sex?: string;
  };
  modality: string;
  cpt_codes: string[];
  icd10_codes: string[];
  clinic_notes: string;
  prior_imaging_summary?: string;
  policy_criteria?: string[];
}

/**
 * System prompt for medical necessity generation
 */
const MEDICAL_NECESSITY_SYSTEM_PROMPT = `You are a medical documentation specialist writing prior authorization justifications.

Your task is to compose a comprehensive medical necessity narrative that:
1. **Establishes medical necessity**: Clearly state why the procedure is clinically appropriate
2. **Documents clinical indications**: Summarize patient history, symptoms, and clinical findings
3. **Addresses risk/benefit**: Explain why this procedure is optimal and alternative approaches

Guidelines:
- Write in professional medical language (third person, past/present tense)
- Reference specific clinical findings from provider notes
- Cite relevant ICD-10 diagnoses and their clinical significance
- Address payer policy criteria if provided
- Avoid subjective language; use objective clinical terms
- Keep total length 300-600 words
- Structure as clear paragraphs (not bullet points)

You must return a JSON object with three fields:
\`\`\`json
{
  "medical_necessity_text": "Primary narrative explaining why procedure is medically necessary...",
  "indications_text": "Clinical indications: patient symptoms, history, exam findings...",
  "risk_benefit_text": "Risk/benefit analysis: why this procedure is optimal, alternatives considered..."
}
\`\`\`

Example style:
"The patient is a 58-year-old female with chronic low back pain (ICD-10: M54.5) radiating to the left lower extremity. Conservative management including physical therapy and NSAIDs over the past 12 weeks has not provided adequate relief. Clinical examination reveals positive straight leg raise test on the left with decreased sensation in the L5 distribution. MRI of the lumbar spine is medically necessary to evaluate for disc herniation or spinal stenosis that may be amenable to interventional treatment."`;

/**
 * Generate medical necessity summary
 */
export async function generateMedicalNecessity(
  input: MedicalNecessityInput
): Promise<LLMResponse<MedicalNecessitySummary>> {
  const {
    patient_demographics,
    modality,
    cpt_codes,
    icd10_codes,
    clinic_notes,
    prior_imaging_summary,
    policy_criteria,
  } = input;

  // Build user prompt with clinical context
  let userPrompt = `Generate a medical necessity justification for:

**Patient:** ${patient_demographics.age ? `${patient_demographics.age}yo` : "Adult"} ${patient_demographics.sex || "patient"}
**Procedure:** ${modality}
**CPT Codes:** ${cpt_codes.join(", ")}
**ICD-10 Codes:** ${icd10_codes.join(", ")}

**Clinical Notes:**
${clinic_notes}
`;

  if (prior_imaging_summary) {
    userPrompt += `\n**Prior Imaging:**\n${prior_imaging_summary}\n`;
  }

  if (policy_criteria && policy_criteria.length > 0) {
    userPrompt += `\n**Payer Policy Criteria to Address:**\n`;
    policy_criteria.forEach((criterion, idx) => {
      userPrompt += `${idx + 1}. ${criterion}\n`;
    });
  }

  userPrompt += `\n\nGenerate the medical necessity narrative as JSON. Return ONLY the JSON object with the three required fields.`;

  const response = await callCacheGPT({
    system: MEDICAL_NECESSITY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.5, // Balanced creativity and consistency
  });

  if (!response.success || !response.data) {
    return {
      success: false,
      data: null,
      error: response.error || "Failed to generate medical necessity",
    };
  }

  try {
    // Parse JSON response
    const jsonMatch = response.data.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const summary: MedicalNecessitySummary = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (
      !summary.medical_necessity_text ||
      !summary.indications_text ||
      !summary.risk_benefit_text
    ) {
      throw new Error("Missing required fields in medical necessity summary");
    }

    // Validate lengths
    if (summary.medical_necessity_text.length < 100) {
      throw new Error("Medical necessity text too short");
    }

    return {
      success: true,
      data: summary,
      error: null,
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    console.error("Failed to parse medical necessity response:", error);
    return {
      success: false,
      data: null,
      error: `Failed to parse medical necessity: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
