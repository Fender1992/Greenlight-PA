# Current Issues - LLM 500 Error

## Status Update

✅ **Fixed:** `ENABLE_LLM` environment variable has been added to Vercel
✅ **Fixed:** Created `/api/v1/messages` endpoint in CacheGPT (already deployed)
✅ **Fixed:** Updated Greenlight baseURL from `/v1` to `/api/v1`
⏳ **Pending:** Add ANTHROPIC_API_KEY to CacheGPT environment & deploy Greenlight fix

## Error Details

**Browser Console:**

```
POST https://greenlightpa.net/api/llm/checklist 500 (Internal Server Error)
POST https://greenlightpa.net/api/llm/medical-necessity 500 (Internal Server Error)
```

**What this means:**

- The feature flag is now enabled (no more 503)
- The API is being called with valid authentication
- Something is failing inside the LLM code execution

## Likely Causes

### 1. CacheGPT API Key Issues (Most Likely)

The `CACHEGPT_API_KEY` might be:

- Invalid or expired
- Not properly formatted
- Missing required permissions

**How to verify:**

```bash
# Check if the key starts with the correct prefix
vercel env pull .env.vercel
grep CACHEGPT_API_KEY .env.vercel
# Should show: CACHEGPT_API_KEY="cgpt_sk_..."
```

### 2. CacheGPT Service Issues

The CacheGPT service at `https://cachegpt.app/v1` might be:

- Down or experiencing issues
- Rejecting the API key
- Rate limiting

**How to test:**

```bash
# Test CacheGPT endpoint directly
curl -X POST https://cachegpt.app/v1/messages \
  -H "x-api-key: YOUR_CACHEGPT_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 3. Anthropic SDK Compatibility

The Anthropic SDK might have issues with the CacheGPT proxy:

- Base URL configuration
- Header formatting
- Authentication method

## Debugging Steps

### Step 1: Check Vercel Function Logs

The 500 error should have a detailed error message in Vercel logs:

```bash
# Get detailed logs
vercel logs greenlightpa.net --follow

# Then trigger the error from the UI
# Look for error messages in the logs
```

### Step 2: Test CacheGPT Directly

Verify your CacheGPT key works:

```bash
# Get your key
vercel env pull .env.vercel
source .env.vercel

# Test it
curl -X POST https://cachegpt.app/v1/messages \
  -H "x-api-key: $CACHEGPT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "test"}]
  }'
```

### Step 3: Temporary Fallback to Direct Anthropic

If CacheGPT is having issues, you can temporarily use direct Anthropic API:

```bash
# Remove or rename CACHEGPT_API_KEY
vercel env rm CACHEGPT_API_KEY

# Add Anthropic key
vercel env add ANTHROPIC_API_KEY
# Value: your-anthropic-api-key

# Redeploy
vercel --prod
```

The client will automatically fall back to direct Anthropic API.

## Quick Fix Options

### Option A: Debug CacheGPT (Recommended)

1. Check Vercel logs for the actual error
2. Verify CacheGPT API key is valid
3. Test CacheGPT endpoint directly
4. Contact CacheGPT support if needed

### Option B: Temporary Direct Anthropic

1. Remove `CACHEGPT_API_KEY` from Vercel
2. Add `ANTHROPIC_API_KEY` instead
3. Redeploy
4. Switch back to CacheGPT once issue is resolved

### Option C: Disable LLM Features

1. Set `ENABLE_LLM=false` in Vercel
2. Users will see "LLM features disabled" message
3. Re-enable once issue is debugged

## Next Steps

1. **Immediate:** Check Vercel logs while triggering the error

   ```bash
   vercel logs greenlightpa.net --follow
   ```

2. **Short-term:** Verify CacheGPT key and service status

3. **Long-term:** Add better error handling and logging to LLM endpoints

## Code to Check

The error is occurring in one of these files:

- `/home/rolo/Greenlight/apps/web/app/api/llm/checklist/route.ts:141`
- `/home/rolo/Greenlight/packages/llm/client.ts:57`
- `/home/rolo/Greenlight/packages/llm/generators/checklist.ts`

The most likely failure point is in the `generateChecklist()` function when it calls the CacheGPT API.

## Environment Variable Summary

Current Vercel Configuration:

```
✅ ENABLE_LLM=true (recently added)
✅ CACHEGPT_API_KEY=cgpt_sk_... (existing)
❌ No ANTHROPIC_API_KEY (not needed if CacheGPT works)
```

Expected Client Behavior:

```typescript
const anthropic = new Anthropic({
  apiKey: process.env.CACHEGPT_API_KEY, // ✅ Uses this
  baseURL: "https://cachegpt.app/v1", // ✅ Routes here
});
```

## Next Steps to Complete the Fix

### 1. Deploy CacheGPT with New Endpoint

The `/v1/messages` endpoint has been created and pushed to GitHub:

- **Repository:** https://github.com/Fender1992/cachegpt
- **Commit:** `5d60378` - "Add Anthropic-compatible /v1/messages endpoint for SDK integration"
- **File:** `/app/api/v1/messages/route.ts`

**To deploy:**

If CacheGPT is connected to Vercel with auto-deploy:

- The new endpoint should deploy automatically from the main branch
- Wait a few minutes for the deployment to complete
- Check https://vercel.com/dashboard for deployment status

If manual deployment is needed:

```bash
cd /home/rolo/cachegpt
vercel --prod
```

### 2. Add ANTHROPIC_API_KEY to CacheGPT Environment

The new endpoint needs the Anthropic API key to proxy requests:

```bash
# In the CacheGPT project (not Greenlight)
cd /home/rolo/cachegpt
vercel env add ANTHROPIC_API_KEY
# Enter your Anthropic API key when prompted
# Select: Production, Preview, Development
```

### 3. Test the Full Flow

Once deployed, test the endpoint:

```bash
# Test CacheGPT endpoint directly
curl -X POST https://cachegpt.app/v1/messages \
  -H "x-api-key: cgpt_sk_8e1a106b2e4a0f86f77beb4147b2d37321f39959ec41ad63d4592b79473a69ff" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

If the endpoint works, test checklist generation in Greenlight PA:

1. Navigate to a PA request detail page at https://greenlightpa.net
2. Click "Generate Checklist"
3. Should successfully generate a checklist

### 4. Verify Deployment

Check that the endpoint is live:

```bash
curl -v https://cachegpt.app/v1/messages
# Should return 401 (missing API key) instead of 405 (method not allowed)
```
