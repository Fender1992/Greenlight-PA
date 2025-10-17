/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Policy Ingestion | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextResponse } from "next/server";
import { ingestPoliciesForPayer } from "@greenlight/policy";
import type { ScraperConfig } from "@greenlight/policy";

/**
 * POST /api/policy/ingest
 *
 * Trigger policy ingestion for a specific payer
 *
 * Body:
 * {
 *   "payer_id": "payer-uuid",
 *   "payer_name": "Blue Cross Blue Shield",
 *   "base_url": "https://www.bcbs.com/policies"
 * }
 *
 * Returns:
 * {
 *   "success": true,
 *   "job_id": "job-123456-payer-uuid",
 *   "policies_ingested": 5,
 *   "errors": []
 * }
 */
export async function POST(request: Request) {
  try {
    // Feature flag check
    if (process.env.ENABLE_POLICY_INGESTION !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: "Policy ingestion is disabled in demo mode",
          hint: "Set ENABLE_POLICY_INGESTION=true to enable",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { payer_id, payer_name, base_url } = body;

    // Validation
    if (!payer_id || !payer_name || !base_url) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: payer_id, payer_name, base_url",
        },
        { status: 400 }
      );
    }

    // Build scraper config
    const config: ScraperConfig = {
      payerId: payer_id,
      payerName: payer_name,
      baseUrl: base_url,
      selectors: {
        // Default selectors - could be customized per payer
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

    // Start ingestion
    console.log(`[API] Starting policy ingestion for ${payer_name}`);
    const result = await ingestPoliciesForPayer(payer_id, config);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          job_id: result.jobId,
          error: "Policy ingestion failed",
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job_id: result.jobId,
      policies_ingested: result.policiesIngested,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[API] Policy ingestion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Ingestion failed",
      },
      { status: 500 }
    );
  }
}
