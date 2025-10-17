/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/llm/versions | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

/**
 * Prompt Version
 *
 * Tracks prompt template versions for reproducibility and A/B testing
 */
export interface PromptVersion {
  version: string;
  date: string;
  model: string;
  changes: string;
  deprecated?: boolean;
}

/**
 * Prompt version history
 *
 * When updating prompts:
 * 1. Add new version entry
 * 2. Mark previous version as deprecated (optional)
 * 3. Update getCurrentVersion() if changing default
 * 4. Document changes clearly
 */
export const PROMPT_VERSIONS: Record<string, PromptVersion> = {
  "v1.0.0": {
    version: "v1.0.0",
    date: "2025-10-17",
    model: "claude-3-5-sonnet-20241022",
    changes:
      "Initial prompt templates for checklist generation and medical necessity summarization",
  },
};

/**
 * Get current active prompt version
 */
export function getCurrentVersion(): PromptVersion {
  return PROMPT_VERSIONS["v1.0.0"];
}

/**
 * Prompt template metadata
 */
export interface PromptMetadata {
  template_name: string;
  version: string;
  model: string;
  generated_at: string;
}

/**
 * Create metadata for generated content
 */
export function createPromptMetadata(
  templateName: string,
  version?: PromptVersion
): PromptMetadata {
  const v = version || getCurrentVersion();
  return {
    template_name: templateName,
    version: v.version,
    model: v.model,
    generated_at: new Date().toISOString(),
  };
}
