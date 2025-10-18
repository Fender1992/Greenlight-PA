# Domain Setup: greenlightpa.net

## Overview

This guide walks through connecting greenlightpa.net to your Vercel deployment.

## Prerequisites

- Domain registered: greenlightpa.net ✅
- Vercel account with Greenlight PA project deployed
- Access to domain registrar (GoDaddy, Namecheap, etc.)

## Step 1: Add Domain to Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Greenlight PA project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `greenlightpa.net`
6. Click **Add**
7. Also add: `www.greenlightpa.net` (recommended)

Vercel will show you DNS configuration instructions.

## Step 2: Configure DNS Records

### Option A: Using Vercel Nameservers (Recommended)

**Pros**: Automatic SSL, faster propagation, easier management

1. Go to your domain registrar's control panel
2. Find **Nameservers** or **DNS Management**
3. Change nameservers to:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
4. Save changes
5. Wait 5-60 minutes for propagation

### Option B: Using Custom DNS Records

**Pros**: Keep existing nameservers, control other DNS records

1. Go to your domain registrar's DNS management
2. Add these records:

   **For Root Domain (greenlightpa.net):**

   ```
   Type: A
   Name: @ (or leave blank)
   Value: 76.76.21.21
   TTL: 3600
   ```

   **For www Subdomain:**

   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

3. Save changes
4. Wait 5-60 minutes for propagation

## Step 3: Configure Vercel Domain Settings

Once DNS is configured:

1. In Vercel dashboard, go to **Settings** → **Domains**
2. You should see both:
   - `greenlightpa.net`
   - `www.greenlightpa.net`
3. Set one as primary (recommended: `greenlightpa.net`)
4. Vercel will automatically:
   - Generate SSL certificate (HTTPS)
   - Redirect www to non-www (or vice versa)
   - Handle DNS propagation

## Step 4: Update Environment Variables

Update your `.env.local` and Vercel environment variables:

```bash
# Old
NEXT_PUBLIC_APP_URL=http://localhost:3000

# New (Production)
NEXT_PUBLIC_APP_URL=https://greenlightpa.net
```

In Vercel:

1. Go to **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_APP_URL` to `https://greenlightpa.net`
3. Select **Production** environment
4. Save
5. Redeploy to apply changes

## Step 5: Verify Setup

### Check DNS Propagation

```bash
# Check A record
dig greenlightpa.net

# Check CNAME record
dig www.greenlightpa.net

# Or use online tool
https://dnschecker.org/#A/greenlightpa.net
```

### Test Domain

1. Wait 5-60 minutes after DNS changes
2. Visit https://greenlightpa.net
3. Check for:
   - ✅ Site loads correctly
   - ✅ HTTPS/SSL working (green padlock)
   - ✅ www redirects to non-www (or vice versa)

## Troubleshooting

### Domain Not Resolving

- **Wait longer**: DNS can take up to 48 hours (usually 5-60 minutes)
- **Clear DNS cache**:

  ```bash
  # Linux/WSL
  sudo systemd-resolve --flush-caches

  # macOS
  sudo dscacheutil -flushcache
  ```

- **Check propagation**: https://dnschecker.org

### SSL Certificate Pending

- Vercel auto-generates SSL certificates
- Can take 5-30 minutes after DNS propagation
- If stuck, try removing and re-adding domain in Vercel

### "Invalid Configuration" in Vercel

- Verify DNS records are correct
- Check for conflicting CNAME/A records
- Ensure no CAA records blocking Vercel

### Wrong Site Shows Up

- Check Vercel project is correct
- Verify domain is added to correct project
- Check for other Vercel projects using same domain

## Common Domain Registrars

### GoDaddy

1. Login to GoDaddy
2. My Products → Domains
3. Click domain → Manage DNS
4. Add/edit records as shown above

### Namecheap

1. Login to Namecheap
2. Domain List → Manage
3. Advanced DNS tab
4. Add/edit records as shown above

### Google Domains

1. Login to Google Domains
2. My domains → Manage
3. DNS tab
4. Add/edit records as shown above

### Cloudflare

1. Login to Cloudflare
2. Select domain
3. DNS tab
4. Add/edit records (disable proxy for initial setup)

## Email Configuration (Optional)

If you want to use greenlightpa.net for email:

1. Keep using DNS records option (not Vercel nameservers)
2. Add MX records from your email provider
3. Add SPF/DKIM/DMARC records for email authentication

Example MX record (Google Workspace):

```
Type: MX
Name: @
Value: ASPMX.L.GOOGLE.COM
Priority: 1
TTL: 3600
```

## Security Recommendations

1. **Enable DNSSEC** at your registrar (if supported)
2. **Domain Privacy/WHOIS Protection** (hide personal info)
3. **Auto-renew** enabled to prevent expiration
4. **2FA** on registrar account
5. **Lock domain** to prevent unauthorized transfers

## Monitoring

Set up monitoring for:

- Domain expiration alerts (registrar usually provides)
- SSL certificate expiration (Vercel handles automatically)
- DNS resolution (UptimeRobot, Pingdom, etc.)
- Website uptime (Vercel Analytics)

## Support

- **Vercel Docs**: https://vercel.com/docs/concepts/projects/domains
- **DNS Propagation**: https://dnschecker.org
- **SSL Check**: https://www.ssllabs.com/ssltest/

## Checklist

- [ ] Domain registered: greenlightpa.net ✅
- [ ] Domain added in Vercel dashboard
- [ ] DNS records configured (A + CNAME or nameservers)
- [ ] DNS propagated (check dnschecker.org)
- [ ] HTTPS/SSL working
- [ ] Environment variables updated
- [ ] Site accessible at https://greenlightpa.net
- [ ] www redirect working
- [ ] Auto-renew enabled at registrar
- [ ] Domain privacy/protection enabled
