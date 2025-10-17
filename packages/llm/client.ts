/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/llm/client | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic Claude Client
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Default model configuration
 */
export const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
export const DEFAULT_MAX_TOKENS = 4096;

/**
 * LLM Response wrapper
 */
export interface LLMResponse<T = string> {
  success: boolean;
  data: T | null;
  error: string | null;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Helper to call Claude with streaming support
 */
export async function callClaude(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}): Promise<LLMResponse<string>> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        data: null,
        error: "ANTHROPIC_API_KEY not configured",
      };
    }

    const response = await anthropic.messages.create({
      model: params.model || DEFAULT_MODEL,
      max_tokens: params.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: params.temperature ?? 1.0,
      system: params.system,
      messages: params.messages,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return {
        success: false,
        data: null,
        error: "Unexpected response type from Claude",
      };
    }

    return {
      success: true,
      data: content.text,
      error: null,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error("Claude API error:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown LLM error",
    };
  }
}

/**
 * Helper to call Claude with streaming
 */
export async function* callClaudeStream(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}): AsyncGenerator<string, void, unknown> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const stream = await anthropic.messages.stream({
    model: params.model || DEFAULT_MODEL,
    max_tokens: params.max_tokens || DEFAULT_MAX_TOKENS,
    temperature: params.temperature ?? 1.0,
    system: params.system,
    messages: params.messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}
