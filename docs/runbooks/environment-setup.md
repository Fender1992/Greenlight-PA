# Environment Setup & Configuration Runbook

**Last Updated:** 2025-10-24

---

## Overview

This runbook covers environment variable configuration and operational requirements for Greenlight PA production deployments.

---

## Core Environment Variables

### Required (All Deployments)

```bash
# Supabase Configuration (Client-side)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]

# Supabase Configuration (Server-side)
NEXT_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_SUPABASE_ANON_KEY=[ANON_KEY]
NEXT_SUPABASE_ROLE_KEY=[SERVICE_ROLE_KEY]
NEXT_SUPABASE_JWT_SECRET=[JWT_SECRET]
```

**Where to Find:**

- Supabase Dashboard → Settings → API
- `NEXT_SUPABASE_ROLE_KEY`: Use service_role key (keep secret!)
- `NEXT_SUPABASE_JWT_SECRET`: Settings → API → JWT Settings

---

## Feature Flags

### LLM Features (AI-Powered Checklist & Medical Necessity)

```bash
ENABLE_LLM=true
CACHEGPT_API_KEY=cgpt_sk_[KEY]
```

**Setup Instructions:**

1. Sign up for CacheGPT at https://cachegpt.app
2. Generate API key from dashboard
3. Set both environment variables
4. Restart application

**Endpoints Enabled:**

- `POST /api/llm/checklist` - Generate PA checklist items
- `POST /api/llm/medical-necessity` - Generate medical necessity summaries

**Cost:** CacheGPT charges per API call. Monitor usage in CacheGPT dashboard.

**Error Handling:**

- If disabled or key missing: Returns 503 with message about configuration
- If key invalid: Returns 401 Unauthorized from CacheGPT
- If rate limited: Returns 429 Too Many Requests

---

### OCR Processing

```bash
ENABLE_OCR=true
```

**What It Enables:**

- `POST /api/ocr/process` - Extract text from document attachments
- Automatic OCR via background job (`/api/jobs/ocr-batch`)

**Current Implementation:**

- Uses mock OCR adapter (returns placeholder text)
- To enable real OCR: Configure Tesseract.js or cloud OCR service in `packages/ocr/adapter.ts`

**No Additional Cost:** Mock adapter is free. Real OCR services vary.

---

### Policy Ingestion

```bash
ENABLE_POLICY_INGESTION=true
```

**What It Enables:**

- `POST /api/policy/ingest` - Ingest policy documents from URLs

**Requirements:**

- Network access to policy document URLs
- Sufficient storage for policy snippets
- Optional: LLM features for intelligent extraction

**Setup Instructions:**

1. Set environment variable to `true`
2. Restart application
3. Policy ingestion available via API

**Security Note:** Only allow trusted users to ingest policies (admin role recommended).

---

## Background Jobs

### OCR Batch Processing

**Cron Configuration (vercel.json):**

```json
{
  "crons": [
    {
      "path": "/api/jobs/ocr-batch",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Environment Variable:**

```bash
CRON_SECRET=[GENERATE_RANDOM_SECRET]
```

**How to Generate Secret:**

```bash
openssl rand -hex 32
```

**Setup Instructions:**

1. Generate secret using command above
2. Set `CRON_SECRET` in Vercel environment variables
3. Vercel automatically calls endpoint every 5 minutes with `Authorization: Bearer [CRON_SECRET]`

**What It Does:**

1. Fetches attachments where `ocr_text IS NULL`
2. Processes up to 10 attachments per run
3. Stores extracted text in `attachment.ocr_text`
4. Returns processing results

**Monitoring:**

- Check Vercel Cron logs for execution status
- Monitor `attachment` table for `ocr_text` population
- Review error logs for failed OCR attempts

**Troubleshooting:**

- **401 Unauthorized:** CRON_SECRET mismatch
- **Timeout:** Too many attachments queued (increase batch limit)
- **503 Service Unavailable:** OCR service unavailable

---

## Optional Features

### Demo Mode

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

**What It Does:**

- Shows demo mode banner on all pages
- Warns users that data is for demonstration only
- No functional changes (data is still persisted)

**When to Use:**

- Staging environments
- Demo instances for prospects
- Development testing

---

### Error Tracking (Sentry)

```bash
NEXT_PUBLIC_SENTRY_DSN=https://[KEY]@[ORG].ingest.sentry.io/[PROJECT]
```

**Setup Instructions:**

1. Create Sentry account and project
2. Copy DSN from project settings
3. Set environment variable
4. Errors automatically reported to Sentry

**What Gets Tracked:**

- JavaScript errors (client-side)
- API route errors (server-side)
- Failed database queries
- Unhandled promise rejections

---

### Product Analytics (PostHog)

```bash
NEXT_PUBLIC_POSTHOG_KEY=[PROJECT_KEY]
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Setup Instructions:**

1. Create PostHog account
2. Create project and copy key
3. Set environment variables
4. Analytics automatically tracked

**What Gets Tracked:**

- Page views
- Feature usage (via feature flags)
- User actions (button clicks, form submissions)
- Conversion funnels

**Feature Flags:**

- PostHog can control feature flags remotely
- Check `packages/llm` for feature flag implementation

---

## Environment-Specific Configuration

### Development (.env.local)

```bash
# Core (required)
NEXT_PUBLIC_SUPABASE_URL=https://[DEV_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[DEV_ANON_KEY]
NEXT_SUPABASE_URL=https://[DEV_PROJECT].supabase.co
NEXT_SUPABASE_ANON_KEY=[DEV_ANON_KEY]
NEXT_SUPABASE_ROLE_KEY=[DEV_SERVICE_ROLE_KEY]
NEXT_SUPABASE_JWT_SECRET=[DEV_JWT_SECRET]

# Feature flags (optional)
ENABLE_LLM=false  # Save API costs during dev
ENABLE_OCR=true
ENABLE_POLICY_INGESTION=true

# Optional
NEXT_PUBLIC_DEMO_MODE=true
```

---

### Staging (.env.staging or Vercel Environment)

```bash
# Core (required)
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[STAGING_ANON_KEY]
NEXT_SUPABASE_URL=https://[STAGING_PROJECT].supabase.co
NEXT_SUPABASE_ANON_KEY=[STAGING_ANON_KEY]
NEXT_SUPABASE_ROLE_KEY=[STAGING_SERVICE_ROLE_KEY]
NEXT_SUPABASE_JWT_SECRET=[STAGING_JWT_SECRET]

# Feature flags
ENABLE_LLM=true
CACHEGPT_API_KEY=cgpt_sk_[STAGING_KEY]
ENABLE_OCR=true
ENABLE_POLICY_INGESTION=true

# Background jobs
CRON_SECRET=[STAGING_CRON_SECRET]

# Optional
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SENTRY_DSN=[STAGING_SENTRY_DSN]
NEXT_PUBLIC_POSTHOG_KEY=[STAGING_POSTHOG_KEY]
```

---

### Production (Vercel Environment)

```bash
# Core (required)
NEXT_PUBLIC_SUPABASE_URL=https://[PROD_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PROD_ANON_KEY]
NEXT_SUPABASE_URL=https://[PROD_PROJECT].supabase.co
NEXT_SUPABASE_ANON_KEY=[PROD_ANON_KEY]
NEXT_SUPABASE_ROLE_KEY=[PROD_SERVICE_ROLE_KEY]
NEXT_SUPABASE_JWT_SECRET=[PROD_JWT_SECRET]

# Feature flags
ENABLE_LLM=true
CACHEGPT_API_KEY=cgpt_sk_[PROD_KEY]
ENABLE_OCR=true
ENABLE_POLICY_INGESTION=false  # Disable unless needed

# Background jobs
CRON_SECRET=[PROD_CRON_SECRET]

# Optional
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SENTRY_DSN=[PROD_SENTRY_DSN]
NEXT_PUBLIC_POSTHOG_KEY=[PROD_POSTHOG_KEY]
```

---

## Vercel Deployment

### Setting Environment Variables

**Via Vercel Dashboard:**

1. Go to Project Settings → Environment Variables
2. Add each variable with appropriate scope:
   - **Production** - Production deployments only
   - **Preview** - PR preview deployments
   - **Development** - Local development (pulled via `vercel env pull`)

**Via Vercel CLI:**

```bash
vercel env add CACHEGPT_API_KEY production
vercel env add ENABLE_LLM production
vercel env add CRON_SECRET production
```

**Pull to Local:**

```bash
vercel env pull .env.vercel
```

---

### Deployment Checklist

**Before Deploying:**

- [ ] All required environment variables set
- [ ] Feature flags configured appropriately
- [ ] CRON_SECRET generated and set
- [ ] Database migrations applied
- [ ] API keys valid and have sufficient quota

**After Deploying:**

- [ ] Verify `/api/health` returns 200 (if exists)
- [ ] Test authentication flow
- [ ] Verify LLM endpoints (if enabled)
- [ ] Check cron job logs
- [ ] Monitor error rates in Sentry

---

## Troubleshooting

### "LLM features disabled" Error

**Symptoms:** POST /api/llm/\* returns 503

**Solution:**

1. Verify `ENABLE_LLM=true` in environment
2. Verify `CACHEGPT_API_KEY` is set
3. Restart application/redeploy
4. Check CacheGPT dashboard for key validity

---

### Cron Job Not Running

**Symptoms:** OCR not processing, no cron logs

**Solution:**

1. Verify `vercel.json` has cron configuration
2. Check Vercel Dashboard → Cron Jobs tab
3. Verify `CRON_SECRET` matches in code and Vercel config
4. Check cron execution logs in Vercel

---

### Supabase Connection Errors

**Symptoms:** All API calls fail with database errors

**Solution:**

1. Verify all 6 Supabase environment variables are set
2. Check Supabase project status (not paused)
3. Verify service role key has correct permissions
4. Check RLS policies allow expected operations
5. Verify JWT secret matches Supabase project

---

### 401 Unauthorized on All Requests

**Symptoms:** Even authenticated requests fail

**Solution:**

1. Check session cookie configuration
2. Verify `NEXT_SUPABASE_JWT_SECRET` is correct
3. Clear browser cookies and re-login
4. Check Supabase Auth logs for user session

---

## Security Best Practices

1. **Never commit environment variables to git**
   - Use `.env.local` (gitignored)
   - Use Vercel dashboard for deployment vars

2. **Rotate secrets regularly**
   - CRON_SECRET every 90 days
   - CACHEGPT_API_KEY if compromised
   - Supabase keys if compromised

3. **Use different keys per environment**
   - Dev, staging, production should have separate API keys
   - Prevents accidental production charges during dev

4. **Restrict admin features**
   - Only enable POLICY_INGESTION in production if needed
   - Limit who can create/delete payers

5. **Monitor API usage**
   - Track CacheGPT API costs
   - Set up alerts for unusual usage patterns
   - Monitor Supabase database connections

---

## Cost Monitoring

### CacheGPT (LLM Features)

**Typical Costs:**

- Checklist generation: ~$0.004 per request
- Medical necessity: ~$0.009 per request

**Monthly Estimate:**

- 100 PA requests/month = ~$1.30/month
- 500 PA requests/month = ~$6.50/month
- 1000 PA requests/month = ~$13/month

**Monitoring:**

- CacheGPT dashboard shows usage/costs
- Set up billing alerts

### Supabase

**Free Tier Limits:**

- 500MB database storage
- 5GB bandwidth
- 50,000 monthly active users

**Exceeding Limits:**

- Upgrade to Pro plan ($25/month)
- Monitor database size and row counts

### Vercel

**Free Tier Limits:**

- 100GB bandwidth
- 6,000 build minutes
- Unlimited API calls (within fair use)

**Costs:**

- Pro plan $20/month for production domains
- Additional bandwidth: $40/100GB

---

## Maintenance Schedule

**Weekly:**

- Review error logs (Sentry)
- Check cron job execution
- Monitor database growth

**Monthly:**

- Review API usage costs (CacheGPT)
- Audit user access (remove inactive)
- Update dependencies (security patches)

**Quarterly:**

- Rotate CRON_SECRET
- Review and update documentation
- Performance audit (database indexes, query optimization)

**Annually:**

- Security audit
- Backup/restore testing
- Disaster recovery drill

---

## Support Contacts

**Supabase:**

- Support: support@supabase.com
- Status: https://status.supabase.com

**Vercel:**

- Support: support@vercel.com
- Status: https://www.vercel-status.com

**CacheGPT:**

- Support: support@cachegpt.app
- Docs: https://docs.cachegpt.app

---

## Additional Resources

- [API Routes Documentation](../api-routes.md)
- [Database Schema Documentation](../database-schema.md)
- [CacheGPT Integration Guide](../cachegpt-integration.md)
- [Security Assessment](../security-assessment.md)
