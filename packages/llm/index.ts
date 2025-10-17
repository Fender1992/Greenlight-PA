/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/llm | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

// Client
export {
  anthropic,
  callClaude,
  callClaudeStream,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  type LLMResponse,
} from "./client";

// Checklist generation
export {
  generateChecklist,
  type ChecklistItem,
  type ChecklistGenerationInput,
} from "./prompts/checklist";

// Medical necessity generation
export {
  generateMedicalNecessity,
  type MedicalNecessitySummary,
  type MedicalNecessityInput,
} from "./prompts/medical-necessity";

// Prompt versioning
export {
  PROMPT_VERSIONS,
  getCurrentVersion,
  type PromptVersion,
} from "./versions";
