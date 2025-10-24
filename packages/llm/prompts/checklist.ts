/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/llm/prompts/checklist | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { callCacheGPT, type LLMResponse } from "../client";

/**
 * Checklist Item
 */
export interface ChecklistItem {
  name: string;
  rationale: string;
  required_bool: boolean;
}

/**
 * Input data for checklist generation
 */
export interface ChecklistGenerationInput {
  modality: string;
  cpt_codes: string[];
  icd10_codes: string[];
  payer_name: string;
  policy_snippets?: string[];
}

/**
 * System prompt for checklist generation
 */
const CHECKLIST_SYSTEM_PROMPT = `You are a medical prior authorization assistant specializing in identifying payer-specific documentation requirements.

Your task is to generate a checklist of documentation requirements for a prior authorization request based on:
- Clinical procedure/modality
- CPT codes (procedure codes)
- ICD-10 codes (diagnosis codes)
- Payer policies

For each checklist item, provide:
1. **name**: Brief description of the required document (e.g., "Prior imaging reports", "Clinical notes from last 6 months")
2. **rationale**: Why this is required based on payer policy (cite specific policy language if available)
3. **required_bool**: true if absolutely required, false if recommended but not mandatory

Guidelines:
- Be specific about timeframes (e.g., "last 6 months", "within 90 days")
- Cite payer policy language when available
- Include common requirements (clinical notes, imaging, labs, specialist reports)
- Mark items as required (true) only if explicitly stated in policy
- Keep names concise (< 100 chars), rationale clear (< 300 chars)
- Return valid JSON array of checklist items

Example output format:
\`\`\`json
[
  {
    "name": "Prior imaging reports from last 12 months",
    "rationale": "Payer requires documentation of previous imaging to establish medical necessity and rule out duplicative studies (Policy Section 4.2)",
    "required_bool": true
  },
  {
    "name": "Clinical notes from ordering provider",
    "rationale": "Provider notes must document clinical indication, relevant patient history, and rationale for specific imaging modality",
    "required_bool": true
  }
]
\`\`\``;

/**
 * Generate checklist items for a PA request
 */
export async function generateChecklist(
  input: ChecklistGenerationInput
): Promise<LLMResponse<ChecklistItem[]>> {
  const { modality, cpt_codes, icd10_codes, payer_name, policy_snippets } =
    input;

  // Build user prompt with clinical context
  let userPrompt = `Generate a prior authorization checklist for:

**Procedure:** ${modality}
**CPT Codes:** ${cpt_codes.join(", ")}
**ICD-10 Codes:** ${icd10_codes.join(", ")}
**Payer:** ${payer_name}
`;

  if (policy_snippets && policy_snippets.length > 0) {
    userPrompt += `\n**Relevant Policy Excerpts:**\n`;
    policy_snippets.forEach((snippet, idx) => {
      userPrompt += `\n${idx + 1}. ${snippet}\n`;
    });
  } else {
    userPrompt += `\n(No specific policy documents available - use general best practices for ${payer_name})`;
  }

  userPrompt += `\n\nGenerate a JSON array of checklist items. Return ONLY the JSON array, no additional text.`;

  const response = await callCacheGPT({
    system: CHECKLIST_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.3, // Lower temperature for more deterministic output
  });

  if (!response.success || !response.data) {
    return {
      success: false,
      data: null,
      error: response.error || "Failed to generate checklist",
    };
  }

  try {
    // Parse JSON response
    const jsonMatch = response.data.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const items: ChecklistItem[] = JSON.parse(jsonMatch[0]);

    // Validate structure
    for (const item of items) {
      if (
        !item.name ||
        !item.rationale ||
        typeof item.required_bool !== "boolean"
      ) {
        throw new Error("Invalid checklist item structure");
      }
    }

    return {
      success: true,
      data: items,
      error: null,
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    console.error("Failed to parse checklist response:", error);
    return {
      success: false,
      data: null,
      error: `Failed to parse checklist: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
