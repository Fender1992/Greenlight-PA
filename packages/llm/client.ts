/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/llm/client | Status: [Check STATUS.md] | Modified: 2025-10-23
 */

/**
 * CacheGPT Configuration
 */
const CACHEGPT_BASE_URL =
  process.env.CACHEGPT_BASE_URL || "https://cachegpt.app/api/v1";
const CACHEGPT_API_KEY = process.env.CACHEGPT_API_KEY || "";

/**
 * Default model configuration
 * Note: CacheGPT expects Anthropic model names
 */
export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
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
      console.error(
        "[CACHEGPT-CLIENT] CACHEGPT_API_KEY not configured in environment"
      );
      return {
        success: false,
        data: null,
        error: "CACHEGPT_API_KEY not configured",
      };
    }

    console.log(
      "[CACHEGPT-CLIENT] Making request to:",
      `${CACHEGPT_BASE_URL}/messages`
    );
    console.log(
      "[CACHEGPT-CLIENT] Using model:",
      params.model || DEFAULT_MODEL
    );
    console.log(
      "[CACHEGPT-CLIENT] API key configured:",
      CACHEGPT_API_KEY.substring(0, 10) + "..."
    );

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
      console.error("[CACHEGPT-CLIENT] API error:", {
        status: response.status,
        statusText: response.statusText,
        url: `${CACHEGPT_BASE_URL}/messages`,
        headers: {
          "x-api-key": CACHEGPT_API_KEY
            ? `${CACHEGPT_API_KEY.substring(0, 10)}...`
            : "MISSING",
          "anthropic-version": "2023-06-01",
        },
        body: {
          model: params.model || DEFAULT_MODEL,
          max_tokens: params.max_tokens || DEFAULT_MAX_TOKENS,
        },
        errorBody: errorText,
      });
      return {
        success: false,
        data: null,
        error: `CacheGPT API error: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    const data = (await response.json()) as CacheGPTResponse;

    console.log("[CACHEGPT-CLIENT] Response received:", {
      id: data.id,
      model: data.model,
      contentBlocks: data.content.length,
      usage: data.usage,
    });

    const content = data.content[0];
    if (content.type !== "text") {
      console.error("[CACHEGPT-CLIENT] Unexpected content type:", content.type);
      return {
        success: false,
        data: null,
        error: "Unexpected response type from CacheGPT",
      };
    }

    console.log(
      "[CACHEGPT-CLIENT] Success! Generated text length:",
      content.text.length
    );
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
    console.error("[CACHEGPT-CLIENT] Unexpected error:", error);
    console.error(
      "[CACHEGPT-CLIENT] Error stack:",
      error instanceof Error ? error.stack : "N/A"
    );
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
