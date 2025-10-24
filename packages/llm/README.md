# @greenlight/llm

LLM prompt builders for Greenlight PA using CacheGPT.

## Features

- Checklist generation from payer policies
- Medical necessity summary generation
- Prompt versioning and tracking
- Direct CacheGPT API integration (no SDK dependencies)
- Type-safe responses

## Setup

### Prerequisites

- CacheGPT API key

### Environment Variables

```bash
# .env.local
ENABLE_LLM=true
CACHEGPT_API_KEY=cgpt_sk_...
```

**Using CacheGPT:**

This package makes direct HTTP calls to CacheGPT:

1. Set `CACHEGPT_API_KEY` to your CacheGPT key (starts with `cgpt_sk_...`)
2. All requests are sent to `https://cachegpt.app/api/v1/messages`
3. CacheGPT handles caching, rate limiting, and model routing
4. No external SDK dependencies - uses native fetch API

## Usage

### Checklist Generation

Generate a checklist of required documentation for a PA request:

```typescript
import { generateChecklist } from "@greenlight/llm";

const result = await generateChecklist({
  modality: "MRI Brain",
  cpt_codes: ["70551"],
  icd10_codes: ["G89.29"],
  payer_name: "Blue Cross",
  policy_snippets: [
    "Prior imaging reports required within 12 months",
    "Clinical notes must document medical necessity",
  ],
});

if (result.success) {
  console.log("Checklist items:", result.data);
  // [
  //   {
  //     name: "Prior imaging reports from last 12 months",
  //     rationale: "Payer requires documentation...",
  //     required_bool: true
  //   },
  //   ...
  // ]
}
```

### Medical Necessity Summary

Generate a medical necessity narrative for a PA request:

```typescript
import { generateMedicalNecessity } from "@greenlight/llm";

const result = await generateMedicalNecessity({
  patient_demographics: {
    age: 58,
    sex: "F",
  },
  modality: "MRI Lumbar Spine",
  cpt_codes: ["72148"],
  icd10_codes: ["M54.5"],
  clinic_notes:
    "Patient reports chronic low back pain radiating to left lower extremity. Conservative management for 12 weeks without relief. Positive straight leg raise test.",
  policy_criteria: [
    "Must document failure of conservative treatment",
    "Red flag symptoms requiring imaging",
  ],
});

if (result.success) {
  console.log("Medical necessity:", result.data.medical_necessity_text);
  console.log("Clinical indications:", result.data.indications_text);
  console.log("Risk/benefit:", result.data.risk_benefit_text);
}
```

### Direct CacheGPT API Calls

For custom prompts:

```typescript
import { callCacheGPT } from "@greenlight/llm";

const response = await callCacheGPT({
  system: "You are a medical coding assistant",
  messages: [
    {
      role: "user",
      content: "What is the CPT code for MRI brain without contrast?",
    },
  ],
  temperature: 0.3,
});

if (response.success) {
  console.log(response.data);
  console.log("Usage:", response.usage);
}
```

### Streaming Responses

For real-time output:

```typescript
import { callCacheGPTStream } from "@greenlight/llm";

for await (const chunk of callCacheGPTStream({
  system: "You are a medical writer",
  messages: [
    { role: "user", content: "Write a medical necessity statement..." },
  ],
})) {
  process.stdout.write(chunk);
}
```

## API Integration

### Checklist Generation

```bash
POST /api/llm/checklist
Content-Type: application/json

{
  "pa_request_id": "uuid-here"
}
```

Returns:

```json
{
  "success": true,
  "data": {
    "checklist_items": [
      {
        "id": "uuid",
        "pa_request_id": "uuid",
        "name": "Prior imaging reports",
        "rationale": "Policy requirement...",
        "required_bool": true,
        "status": "pending"
      }
    ],
    "llm_metadata": {
      "model": "claude-3-5-sonnet-20241022",
      "usage": {
        "input_tokens": 500,
        "output_tokens": 200
      }
    }
  }
}
```

### Medical Necessity Generation

```bash
POST /api/llm/medical-necessity
Content-Type: application/json

{
  "pa_request_id": "uuid-here"
}
```

Returns:

```json
{
  "success": true,
  "data": {
    "summary": {
      "id": "uuid",
      "pa_request_id": "uuid",
      "medical_necessity_text": "The patient is a 58-year-old female...",
      "indications_text": "Clinical indications include...",
      "risk_benefit_text": "Risk/benefit analysis...",
      "generated_by_model": "claude-3-5-sonnet-20241022",
      "version": 1
    },
    "llm_metadata": {
      "model": "claude-3-5-sonnet-20241022",
      "usage": {
        "input_tokens": 800,
        "output_tokens": 600
      }
    }
  }
}
```

## Prompt Versioning

All prompts are versioned for reproducibility:

```typescript
import { PROMPT_VERSIONS, getCurrentVersion } from "@greenlight/llm";

const currentVersion = getCurrentVersion();
console.log(currentVersion);
// {
//   version: "v1.0.0",
//   date: "2025-10-17",
//   model: "claude-3-5-sonnet-20241022",
//   changes: "Initial prompt templates..."
// }
```

When updating prompts:

1. Add new version entry to `PROMPT_VERSIONS`
2. Mark previous version as deprecated (optional)
3. Update `getCurrentVersion()` if changing default
4. Document changes clearly

## Response Format

All LLM functions return a consistent `LLMResponse<T>` type:

```typescript
interface LLMResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

## Testing

```bash
npm run test
```

Tests use mocked Claude API responses. See `tests/checklist.test.ts` for examples.

## Best Practices

1. **Temperature**: Use lower values (0.3) for deterministic outputs (checklists), higher (0.5-0.7) for creative text (summaries)
2. **Token Limits**: Default is 4096 tokens. Adjust via `max_tokens` parameter
3. **Error Handling**: Always check `result.success` before accessing `result.data`
4. **Rate Limiting**: Implement exponential backoff for production use
5. **Cost Tracking**: Log `usage` metrics for billing analysis
6. **Prompt Updates**: Version all prompt changes for reproducibility

## Cost Estimation

Based on Claude 3.5 Sonnet pricing (as of 2025-10):

- Checklist generation: ~500 input + 300 output tokens = $0.004/request
- Medical necessity: ~800 input + 600 output tokens = $0.009/request

See [Anthropic pricing](https://www.anthropic.com/pricing) for current rates.

## Future Enhancements

1. **Structured Outputs**: Use tool calling for guaranteed JSON format
2. **Few-Shot Learning**: Add example checklists/summaries to prompts
3. **Policy RAG**: Integrate vector search for policy retrieval
4. **Multi-Model Support**: Add GPT-4, Gemini adapters
5. **Prompt A/B Testing**: Track performance by prompt version
