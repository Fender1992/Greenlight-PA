# @greenlight/policy

Policy ingestion and normalization package for Greenlight PA - scrape, parse, and store payer policy documents.

## Features

- Policy document scraping from payer websites
- Intelligent text parsing and normalization
- CPT and ICD-10 code extraction
- Requirement and approval criteria identification
- Policy versioning and change tracking
- Rate limiting and retry logic
- Type-safe policy structures

## Setup

### Prerequisites

- Node.js 20+
- For production scraping: Playwright or Puppeteer (not included)

### Installation

```bash
npm install
```

## Usage

### Basic Policy Ingestion

```typescript
import { ingestPoliciesForPayer, type ScraperConfig } from "@greenlight/policy";

const config: ScraperConfig = {
  payerId: "payer-001",
  payerName: "Blue Cross Blue Shield",
  baseUrl: "https://www.bcbs.com/policies",
  selectors: {
    policyList: 'a[href*="policy"]',
    policyDocument: ".policy-content",
    title: "h1",
    content: ".content",
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayMs: 2000,
  },
};

const result = await ingestPoliciesForPayer("payer-001", config);

if (result.success) {
  console.log(`Ingested ${result.policiesIngested} policies`);
} else {
  console.error("Errors:", result.errors);
}
```

### Policy Scraping

```typescript
import { scrapePolicies, type ScraperConfig } from "@greenlight/policy";

const config: ScraperConfig = {
  payerId: "payer-001",
  payerName: "Blue Cross Blue Shield",
  baseUrl: "https://www.bcbs.com/policies",
  selectors: {
    policyList: 'a[href*="policy"]',
  },
};

const scraperResult = await scrapePolicies(config);

console.log(`Found ${scraperResult.policies.length} policies`);
for (const policy of scraperResult.policies) {
  console.log(`- ${policy.title} (${policy.modality})`);
}
```

### Policy Normalization

```typescript
import { normalizePolicy, type RawPolicy } from "@greenlight/policy";

const rawPolicy: RawPolicy = {
  title: "MRI Brain Policy",
  modality: "MRI Brain",
  url: "https://example.com/policy",
  rawHtml: "<html>...</html>",
  rawText: `
    MRI Brain - Prior Authorization Requirements

    Requirements:
    1. Clinical notes from last 3 months
    2. Prior conservative treatment attempted

    CPT Codes: 70553, 70551, 70552
    ICD-10 Codes: G89.29, R51
  `,
  effectiveDate: "2025-01-01",
};

const result = normalizePolicy(rawPolicy, {
  extractCPTCodes: true,
  extractICD10Codes: true,
  identifyRequirements: true,
  identifyApprovalCriteria: true,
});

if (result.success && result.normalized) {
  console.log("CPT Codes:", result.normalized.cptCodes);
  console.log("Requirements:", result.normalized.requirements.length);
  console.log("Warnings:", result.warnings);
}
```

### Policy Validation

```typescript
import { validatePolicy } from "@greenlight/policy";

const validation = validatePolicy(normalizedPolicy);

if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
}
```

## API Integration

### Policy Ingestion Endpoint

```bash
POST /api/policy/ingest
Content-Type: application/json
Authorization: Bearer <token>

{
  "payer_id": "payer-uuid",
  "payer_name": "Blue Cross Blue Shield",
  "base_url": "https://www.bcbs.com/policies"
}
```

Returns:

```json
{
  "success": true,
  "job_id": "job-123456-payer-uuid",
  "policies_ingested": 5,
  "errors": []
}
```

## Demo Mode

By default, the policy scraper runs in **demo mode** and returns mock policies. To enable actual scraping:

```bash
# Enable policy scraping (requires Playwright/Puppeteer)
ENABLE_POLICY_SCRAPER=true

# Enable policy ingestion API
ENABLE_POLICY_INGESTION=true
```

## Data Structures

### PolicyContent

```typescript
interface PolicyContent {
  title: string;
  modality: string;
  cptCodes: string[];
  icd10Codes?: string[];
  sections: PolicySection[];
  requirements: PolicyRequirement[];
  approvalCriteria: ApprovalCriteria[];
  denialReasons?: string[];
  notes?: string;
}
```

### PolicyRequirement

```typescript
interface PolicyRequirement {
  id: string;
  requirement: string;
  category:
    | "clinical_documentation"
    | "prior_treatment"
    | "diagnostic_testing"
    | "provider_qualification"
    | "other";
  mandatory: boolean;
  details?: string;
}
```

### PolicySnippet (Database Storage)

```typescript
interface PolicySnippet {
  id: string;
  payerId: string;
  modality: string;
  requirement: string;
  rationale?: string;
  effectiveDate: string;
  expirationDate?: string;
  cptCodes?: string[];
  icd10Codes?: string[];
  sourceUrl?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}
```

## Architecture

### Pipeline Flow

1. **Scraping** - Fetch policy documents from payer websites
2. **Parsing** - Extract text content from HTML/PDF
3. **Normalization** - Structure unstructured policy text
4. **Validation** - Ensure required fields are present
5. **Snippet Extraction** - Break policy into discrete requirements
6. **Storage** - Save policy snippets to database
7. **Versioning** - Track policy changes over time

### Text Extraction Patterns

The normalizer uses regex patterns and heuristics to identify:

- **CPT Codes**: 5-digit numbers in context of "CPT" or "Code"
- **ICD-10 Codes**: Letter + 2-3 digits + optional decimal + 1-4 alphanumeric
- **Requirements**: Numbered or bulleted lists under "Requirements" heading
- **Approval Criteria**: Numbered or bulleted lists under "Approval" heading
- **Sections**: Lines ending with ":" or in ALL CAPS

### Rate Limiting

The `RateLimiter` class enforces:

- Maximum requests per minute
- Minimum delay between requests
- Automatic throttling when limits are reached

Example:

```typescript
import { RateLimiter } from "@greenlight/policy";

const limiter = new RateLimiter(10, 2000); // 10 req/min, 2s delay

for (const url of urls) {
  await limiter.throttle();
  const policy = await fetchPolicyDocument(url);
}
```

## Testing

```bash
npm run test
```

Tests verify:

- Policy normalization from raw text
- CPT and ICD-10 code extraction
- Requirement and criteria identification
- Policy validation
- Warning generation

## Design Decisions

### Why Mock Data in Demo Mode?

Policy scraping requires:

1. Headless browser (Playwright/Puppeteer)
2. Payer portal authentication
3. Legal compliance (robots.txt, terms of service)
4. Site-specific CSS selectors
5. PDF parsing libraries

In demo mode, we provide realistic mock policies to demonstrate the full workflow without these dependencies.

### Text Parsing vs. LLM Extraction

We use regex-based text parsing instead of LLM extraction because:

- **Performance**: Regex is fast and deterministic
- **Cost**: No LLM API calls required
- **Reliability**: Patterns are consistent across payers
- **Privacy**: No policy text sent to external APIs

Future enhancement: Use LLM as a fallback when regex extraction fails.

### Policy Snippet Storage

Instead of storing full policy documents, we extract discrete "snippets" (individual requirements) because:

- Easier to query for specific requirements
- Enables granular versioning
- Supports better LLM prompt context
- Reduces database size

### Versioning Strategy

Each policy snippet has a version string (`YYYY.V` format):

- **Major version**: Year of effective date
- **Minor version**: Incremental update within year

When a policy changes:

1. Old snippets are marked `expired`
2. New snippets are inserted with incremented version
3. Policy change record is created for audit trail

## Production Considerations

### Scraper Implementation

For production, implement scraping with Playwright:

```typescript
import { chromium } from "playwright";

export async function fetchPolicyDocument(
  url: string
): Promise<RawPolicy | null> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle" });

    const title = await page.textContent("h1");
    const content = await page.textContent(".policy-content");

    await browser.close();

    return {
      title: title || "Untitled",
      modality: extractModalityFromTitle(title),
      url,
      rawHtml: await page.content(),
      rawText: content || "",
      effectiveDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Fetch error:", error);
    await browser.close();
    return null;
  }
}
```

### PDF Parsing

For PDF policy documents, use `pdf-parse`:

```typescript
import pdf from "pdf-parse";

export async function parsePolicyPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}
```

### Authentication

Many payer portals require authentication:

```typescript
export async function loginToPayerPortal(
  page: Page,
  credentials: { username: string; password: string }
): Promise<boolean> {
  await page.goto("https://provider.payer.com/login");
  await page.fill("#username", credentials.username);
  await page.fill("#password", credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  return page.url().includes("/dashboard");
}
```

### Change Detection

Schedule periodic ingestion jobs to detect policy changes:

```typescript
// Run daily at 2 AM
export async function scheduledPolicyCheck() {
  const payers = await getAllPayers();

  for (const payer of payers) {
    const config = getScraperConfigForPayer(payer.id);
    const result = await ingestPoliciesForPayer(payer.id, config);

    if (result.errors.length > 0) {
      await notifyAdmins(payer.name, result.errors);
    }
  }
}
```

## Troubleshooting

### "Policy scraping not yet implemented"

You're seeing the placeholder error. Enable scraping with:

```bash
ENABLE_POLICY_SCRAPER=true
```

And implement actual scraping logic in `scraper.ts`.

### No CPT codes extracted

Check that your policy text includes "CPT" or "Code" keywords near the 5-digit codes. The normalizer looks for context clues.

### Requirements not detected

Ensure your policy has a "Requirements:" heading followed by numbered or bulleted items. The normalizer uses section headers to identify requirement lists.

### Rate limiting too aggressive

Adjust the rate limiter configuration:

```typescript
const config: ScraperConfig = {
  // ...
  rateLimit: {
    requestsPerMinute: 20, // Increase from 10
    delayMs: 1000, // Reduce from 2000
  },
};
```

## Future Enhancements

1. **LLM Fallback** - Use Claude to extract policy data when regex fails
2. **Multi-Format Support** - Parse DOCX, XML, JSON policy documents
3. **Change Notifications** - Email alerts when policies are updated
4. **Policy Search** - Full-text search across all policy snippets
5. **Payer Templates** - Pre-configured selectors for major payers
6. **Policy Analytics** - Approval rate trends by policy change
7. **Bulk Import** - Upload policy PDFs directly from admin UI

## Dependencies

- None in demo mode
- **Production**: Playwright or Puppeteer for scraping
- **Optional**: pdf-parse for PDF documents

## Directory Structure

```
packages/policy/
├── types.ts              # Type definitions
├── scraper.ts            # Web scraping utilities
├── normalizer.ts         # Text parsing and normalization
├── ingestion.ts          # Ingestion pipeline
├── tests/
│   └── normalizer.test.ts # Unit tests
├── index.ts              # Main exports
├── package.json
└── README.md             # This file
```

## References

- [Playwright Documentation](https://playwright.dev/)
- [CPT Code Standard](https://www.ama-assn.org/practice-management/cpt)
- [ICD-10 Code Standard](https://www.cdc.gov/nchs/icd/icd-10-cm.htm)
