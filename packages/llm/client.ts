/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/llm/client | Status: [Check STATUS.md] | Modified: 2025-10-23
 */

/**
 * CacheGPT Configuration
 */
const CACHEGPT_BASE_URL = "https://cachegpt.app/api/v1";
const CACHEGPT_API_KEY = process.env.CACHEGPT_API_KEY || "";

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
 * CacheGPT API Response Types
 */
interface CacheGPTResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Call CacheGPT API directly
 */
export async function callCacheGPT(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}): Promise<LLMResponse<string>> {
  try {
    if (!CACHEGPT_API_KEY) {
      return {
        success: false,
        data: null,
        error: "CACHEGPT_API_KEY not configured",
      };
    }

    const response = await fetch(`${CACHEGPT_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CACHEGPT_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.model || DEFAULT_MODEL,
        max_tokens: params.max_tokens || DEFAULT_MAX_TOKENS,
        temperature: params.temperature ?? 1.0,
        system: params.system,
        messages: params.messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CacheGPT API error:", response.status, errorText);
      return {
        success: false,
        data: null,
        error: `CacheGPT API error: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as CacheGPTResponse;

    const content = data.content[0];
    if (content.type !== "text") {
      return {
        success: false,
        data: null,
        error: "Unexpected response type from CacheGPT",
      };
    }

    return {
      success: true,
      data: content.text,
      error: null,
      model: data.model,
      usage: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error("CacheGPT API error:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown CacheGPT error",
    };
  }
}

/**
 * Alias for backwards compatibility
 * @deprecated Use callCacheGPT instead
 */
export const callClaude = callCacheGPT;

/**
 * Call CacheGPT API with streaming
 * Note: CacheGPT streaming implementation would go here
 * For now, this is a placeholder that returns the full response
 */
export async function* callCacheGPTStream(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}): AsyncGenerator<string, void, unknown> {
  if (!CACHEGPT_API_KEY) {
    throw new Error("CACHEGPT_API_KEY not configured");
  }

  // For streaming, we would need to handle Server-Sent Events (SSE)
  // This is a simplified implementation that yields the full response
  const response = await callCacheGPT(params);

  if (response.success && response.data) {
    yield response.data;
  } else {
    throw new Error(response.error || "Unknown CacheGPT streaming error");
  }
}

/**
 * Alias for backwards compatibility
 * @deprecated Use callCacheGPTStream instead
 */
export const callClaudeStream = callCacheGPTStream;
