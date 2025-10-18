# Vercel Domain Setup: greenlightpa.net

Since you purchased the domain through Vercel, the DNS is already managed by Vercel automatically. This makes setup much simpler!

## Step 1: Add Domain to Your Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **Greenlight PA** project
3. Click **Settings** in the top navigation
4. Click **Domains** in the left sidebar
5. You should see greenlightpa.net listed (since you purchased it through Vercel)

## Step 2: Assign Domain to Project

1. In the Domains section, you'll see greenlightpa.net
2. Click **Add** or **Assign Domain** next to greenlightpa.net
3. Vercel will ask which domain variation to add:
   - Add: `greenlightpa.net` (apex/root domain)
   - Add: `www.greenlightpa.net` (www subdomain) - Recommended to add both

4. Click **Add** for each one

## Step 3: Configure Primary Domain

1. After both domains are added, you'll see them listed
2. Click the **⋯** (three dots) menu next to your preferred domain
3. Select **Set as Primary Domain**
4. Recommended: Set `greenlightpa.net` (non-www) as primary

This ensures:

- `greenlightpa.net` → Your app
- `www.greenlightpa.net` → Redirects to greenlightpa.net

## Step 4: Verify DNS Configuration (Automatic)

Since you bought through Vercel:

- ✅ DNS is automatically configured
- ✅ SSL certificate is automatically provisioned
- ✅ HTTPS is automatically enabled
- ✅ No manual DNS records needed!

You can verify by clicking on the domain name - Vercel will show:

- **Valid Configuration** ✅
- **SSL Certificate**: Active

## Step 5: Update Environment Variables

Now that your domain is live, update your production environment variables:

1. Still in **Settings**, click **Environment Variables** in the left sidebar
2. Find `NEXT_PUBLIC_APP_URL` or create it if it doesn't exist
3. Update/Add the variable:
   ```
   Name: NEXT_PUBLIC_APP_URL
   Value: https://greenlightpa.net
   Environment: Production (check only Production)
   ```
4. Click **Save**

## Step 6: Redeploy (Required for Env Vars)

Environment variable changes require a redeploy:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **⋯** (three dots) in the top right
4. Click **Redeploy**
5. Confirm the redeployment

**Or use the CLI:**

```bash
cd /home/rolo/Greenlight
vercel --prod
```

## Step 7: Test Your Domain

After redeployment (usually takes 1-2 minutes):

1. Visit https://greenlightpa.net in your browser
2. Verify:
   - ✅ Site loads correctly
   - ✅ Green padlock (HTTPS/SSL working)
   - ✅ No certificate warnings
   - ✅ www.greenlightpa.net redirects to greenlightpa.net

3. Test the redirect:
   - Visit https://www.greenlightpa.net
   - Should automatically redirect to https://greenlightpa.net

## Step 8: Update Local Environment (Optional)

Update your local `.env.local` to know about the production URL:

```bash
# Local development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production (for reference, commented out)
# NEXT_PUBLIC_APP_URL=https://greenlightpa.net
```

## Verification Checklist

- [ ] greenlightpa.net added to project in Vercel
- [ ] www.greenlightpa.net added to project in Vercel
- [ ] Primary domain set (greenlightpa.net recommended)
- [ ] Domains show "Valid Configuration" in Vercel
- [ ] SSL certificate shows "Active"
- [ ] Environment variable NEXT_PUBLIC_APP_URL updated to https://greenlightpa.net
- [ ] Project redeployed after env var update
- [ ] https://greenlightpa.net loads your app
- [ ] HTTPS shows green padlock
- [ ] www redirect works correctly

## Troubleshooting

### "Domain is not configured" Error

**Issue**: Domain shows as not configured in Vercel

**Solution**:

1. Make sure you assigned the domain to the correct project
2. Check you're looking at the right project in the dashboard
3. Wait 30-60 seconds and refresh - Vercel may be provisioning

### SSL Certificate Pending

**Issue**: Certificate shows "Pending" or "Provisioning"

**Solution**:

1. This is normal and can take 5-30 minutes
2. Vercel automatically provisions Let's Encrypt certificates
3. Refresh the page after a few minutes
4. If stuck after 1 hour, try removing and re-adding the domain

### Site Shows 404

**Issue**: Domain loads but shows Vercel 404 page

**Solution**:

1. Verify domain is assigned to the correct project
2. Check that you have a deployment (Deployments tab should show recent deployment)
3. Try redeploying the project

### Environment Variables Not Updating

**Issue**: App still using old URL or localhost

**Solution**:

1. Environment variable changes ONLY apply to NEW deployments
2. You MUST redeploy after changing env vars
3. Clear your browser cache or use incognito mode to test

### Multiple Projects Using Same Domain

**Issue**: "Domain is already in use" error

**Solution**:

1. Go to your other Vercel projects
2. Find which one has greenlightpa.net assigned
3. Remove it from that project first
4. Then assign to your Greenlight PA project

## Domain Management

### View Domain Details

1. Settings → Domains
2. Click on domain name
3. View:
   - Configuration status
   - SSL certificate status
   - DNS records (managed automatically)
   - Traffic/analytics

### Remove Domain

1. Settings → Domains
2. Click **⋯** next to domain
3. Click **Remove Domain**
4. Confirm

### Transfer Domain Away from Vercel

If you later want to transfer the domain to another registrar:

1. Settings → Domains
2. Click on greenlightpa.net
3. Look for **Transfer Out** or **Domain Management**
4. Follow Vercel's transfer process
5. Note: You'll need to update DNS manually after transfer

## Auto-Renewal

Domains purchased through Vercel auto-renew by default:

1. Check renewal settings: Settings → Domains → greenlightpa.net
2. Verify billing method is current
3. You'll receive email reminders before renewal
4. Renewals typically charge 30 days before expiration

## Support Resources

- **Vercel Domain Docs**: https://vercel.com/docs/concepts/projects/domains
- **Vercel Support**: https://vercel.com/support
- **SSL Issues**: https://vercel.com/docs/concepts/projects/domains/troubleshooting

## Quick Command Reference

```bash
# Redeploy from CLI
cd /home/rolo/Greenlight
vercel --prod

# Check deployment status
vercel ls

# View project info
vercel project
```

## Summary: What Vercel Handles Automatically

When you buy a domain through Vercel, they automatically manage:

✅ **DNS Records** - No manual configuration needed
✅ **SSL/TLS Certificates** - Auto-provisioned and renewed
✅ **HTTPS Redirect** - HTTP → HTTPS automatic
✅ **www Redirect** - Based on your primary domain setting
✅ **Domain Renewal** - Auto-renewed annually
✅ **CDN Configuration** - Global edge network

You just need to:

1. Assign domain to project
2. Update environment variables
3. Redeploy

That's it! 🎉
