# CacheGPT Integration Guide

**Last Updated:** 2025-10-17

---

## Overview

CacheGPT is an intelligent LLM caching proxy that can significantly reduce API costs by caching similar prompts and responses. This guide explains how to integrate Greenlight PA with CacheGPT.

## What is CacheGPT?

CacheGPT is a high-performance caching proxy for LLM APIs with:

- **Intelligent Caching**: Exact match and semantic similarity caching
- **Cost Optimization**: Reduce API costs by up to 80%
- **Multi-Provider Support**: OpenAI and Anthropic API compatibility
- **Analytics**: Real-time usage statistics and cache hit rates

Repository: `~/cachegpt`

## Integration Architecture

```
Greenlight PA → CacheGPT → Anthropic Claude API
                    ↓
                 Cache DB
```

### How It Works

1. Greenlight sends a prompt to CacheGPT
2. CacheGPT checks if a similar prompt exists in cache
3. If **cache hit**: Returns cached response immediately (no API call)
4. If **cache miss**: Forwards to Claude API, caches response, returns result
5. Saves costs and reduces latency for similar prompts

## Current Implementation

### Direct Anthropic Integration (Section 3)

The current `@greenlight/llm` package uses direct Anthropic SDK integration:

**File**: `packages/llm/client.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function callClaude(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}): Promise<LLMResponse<string>> {
  const response = await anthropic.messages.create({
    model: params.model || DEFAULT_MODEL,
    max_tokens: params.max_tokens || DEFAULT_MAX_TOKENS,
    temperature: params.temperature ?? 1.0,
    system: params.system,
    messages: params.messages,
  });
  // ... return formatted response
}
```

## Recommended Integration Approach

### Option 1: CacheGPT as Optional Proxy (Recommended)

Add CacheGPT SDK and create an adapter that uses it when enabled:

**Step 1**: Copy CacheGPT SDK to Greenlight

```bash
cp -r ~/cachegpt/sdk/javascript/src/* /home/rolo/Greenlight/packages/llm/cachegpt-sdk/
```

**Step 2**: Create CacheGPT adapter in `packages/llm/adapters/cachegpt.ts`

```typescript
import { CacheGPT } from "../cachegpt-sdk/client";
import type { LLMResponse } from "../client";

export async function callClaudeViaCacheGPT(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}): Promise<LLMResponse<string>> {
  const client = new CacheGPT({
    apiKey: process.env.CACHEGPT_API_KEY || "",
    baseUrl: process.env.CACHEGPT_BASE_URL || "http://localhost:3000",
  });

  // Convert messages to CacheGPT format
  const messages = [
    { role: "system" as const, content: params.system },
    ...params.messages,
  ];

  const response = await client.chat(messages, {
    model: params.model || "claude-3-5-sonnet-20241022",
    temperature: params.temperature ?? 1.0,
    maxTokens: params.max_tokens || 4096,
  });

  return {
    success: true,
    data: response.content,
    error: null,
    model: response.model,
    usage: {
      input_tokens: 0, // CacheGPT may not provide this
      output_tokens: response.tokensUsed,
    },
    cached: response.cached,
    cache_hit: response.cacheHit,
  };
}
```

**Step 3**: Update `packages/llm/client.ts` to support both

```typescript
export async function callClaude(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}): Promise<LLMResponse<string>> {
  const useCacheGPT = process.env.USE_CACHEGPT === "true";

  if (useCacheGPT) {
    // Use CacheGPT proxy
    return await callClaudeViaCacheGPT(params);
  } else {
    // Direct Anthropic API (current implementation)
    return await callClaudeDirectly(params);
  }
}
```

### Option 2: CacheGPT Server Integration

If you want to run CacheGPT as a separate service:

**Step 1**: Start CacheGPT server

```bash
cd ~/cachegpt
npm run dev
```

**Step 2**: Configure Greenlight to use CacheGPT endpoint

```bash
# .env.local
USE_CACHEGPT=true
CACHEGPT_BASE_URL=http://localhost:3000
CACHEGPT_API_KEY=cgpt_your_key_here
```

**Step 3**: CacheGPT will proxy calls to Claude and cache responses

## Environment Variables

```bash
# .env.local

# Direct Anthropic (current)
ANTHROPIC_API_KEY=sk-ant-...
ENABLE_LLM=true

# CacheGPT Integration (optional)
USE_CACHEGPT=false              # Set to true to enable
CACHEGPT_BASE_URL=http://localhost:3000
CACHEGPT_API_KEY=cgpt_...
```

## Benefits of CacheGPT Integration

### 1. Cost Savings

- **Checklist Generation**: Similar PA requests (same modality, payer) → cache hit
- **Medical Necessity**: Similar clinical scenarios → cache hit
- **Estimated Savings**: 60-80% reduction in API costs

### 2. Performance

- **Cache Hit**: < 100ms response time
- **Cache Miss**: Normal Claude API latency
- **Semantic Matching**: Similar (not identical) prompts can hit cache

### 3. Analytics

- Track cache hit rates
- Monitor cost savings
- Analyze prompt patterns

## When to Use CacheGPT

### Good Use Cases for Greenlight PA

✅ **Checklist Generation**

- Same payer + modality combinations repeat frequently
- Policy requirements don't change daily
- High cache hit potential

✅ **Policy Snippet Matching**

- Policy language is relatively static
- Similar procedures require similar requirements
- Semantic similarity matching works well

⚠️ **Medical Necessity** (Partial)

- Patient-specific details make caching less effective
- May still get hits for similar clinical scenarios
- Lower but still valuable cache rate

### When NOT to Use

❌ **Real-time status updates**
❌ **Highly variable patient-specific content**
❌ **When freshness is critical**

## Implementation Status

### Current State (Section 3 Complete)

- ✅ Direct Anthropic Claude integration
- ✅ Checklist generation prompt
- ✅ Medical necessity prompt
- ✅ Prompt versioning system
- ✅ LLM API routes

### CacheGPT Integration (Optional Enhancement)

- ⏳ CacheGPT SDK integration
- ⏳ Adapter layer for proxy mode
- ⏳ Environment variable configuration
- ⏳ Analytics dashboard for cache stats

## Cost Analysis

### Without CacheGPT (Current)

```
Checklist generation:  500 input + 300 output tokens = $0.004/request
Medical necessity:     800 input + 600 output tokens = $0.009/request
Monthly (1000 PAs):    $13/month
```

### With CacheGPT (Estimated 70% cache hit)

```
Cache hits (70%):      0 tokens (cached) = $0
Cache misses (30%):    Same as above
Monthly (1000 PAs):    $3.90/month ($9.10 saved)
Annual savings:        $109/year
```

## Next Steps

If you want to integrate CacheGPT:

1. **Test CacheGPT locally**

   ```bash
   cd ~/cachegpt
   npm install
   npm run dev
   ```

2. **Copy SDK to Greenlight**

   ```bash
   cp -r ~/cachegpt/sdk/javascript/src/* \
     /home/rolo/Greenlight/packages/llm/cachegpt-sdk/
   ```

3. **Implement adapter pattern** (see Option 1 above)

4. **Test with sample prompts**
   - Generate checklist for same PA twice
   - Verify cache hit on second request
   - Check cost savings in CacheGPT dashboard

5. **Deploy CacheGPT** (production)
   - Deploy CacheGPT to Vercel/Render
   - Configure production API keys
   - Update Greenlight environment variables

## Decision

**Recommendation**: Keep direct Anthropic integration as default for now. Add CacheGPT as an optional enhancement in a future section (Section 6 or later) after core features are complete.

**Rationale**:

- Sections 4-5 (PDF + UI) are higher priority
- CacheGPT integration is an optimization, not a core requirement
- Can be added incrementally without breaking changes
- Direct API integration is simpler for initial deployment

## References

- CacheGPT Repository: `~/cachegpt`
- CacheGPT Client: `~/cachegpt/sdk/javascript/src/client.ts`
- Greenlight LLM Package: `/home/rolo/Greenlight/packages/llm/`
