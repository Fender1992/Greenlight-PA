# Greenlight PA - Security Assessment

**Last Updated:** 2025-10-17
**Version:** 1.0
**Status:** Initial Assessment

---

## Executive Summary

This document provides a comprehensive security assessment of the Greenlight PA (Prior Authorization) system. The system is designed with security-first principles, implementing multi-tenant data isolation, comprehensive audit logging, and healthcare compliance considerations.

**Overall Security Posture:** ✅ Strong (Demo/Development Mode)

**Key Strengths:**
- Row Level Security (RLS) enforced at database level
- Multi-tenant data isolation
- Comprehensive audit logging
- No PHI in demo mode
- Type-safe codebase with strict TypeScript

**Areas for Production Hardening:**
- Authentication integration (Supabase Auth)
- PHI encryption at rest and in transit
- HIPAA compliance implementation
- Security monitoring and alerting
- Penetration testing

---

## Threat Model

### Assets

1. **Protected Health Information (PHI)**
   - Patient demographics (name, DOB, member ID)
   - Clinical notes and medical history
   - Diagnosis codes (ICD-10)
   - Provider information
   - Insurance/payer information

2. **Business-Critical Data**
   - Prior authorization requests and decisions
   - Payer policies and requirements
   - Organizational configurations
   - User accounts and permissions

3. **System Infrastructure**
   - Database (Supabase PostgreSQL)
   - Application servers (Vercel/Next.js)
   - API keys (Anthropic, Supabase)
   - Storage buckets (attachments)

### Threat Actors

1. **External Attackers**
   - Threat: Data breach, ransomware, DoS attacks
   - Motivation: Financial gain, competitive intelligence
   - Capability: Moderate to high

2. **Malicious Insiders**
   - Threat: Data exfiltration, unauthorized access
   - Motivation: Financial gain, espionage
   - Capability: High (legitimate access)

3. **Competitors**
   - Threat: Intellectual property theft
   - Motivation: Competitive advantage
   - Capability: Moderate

4. **Nation-State Actors**
   - Threat: Healthcare data collection, infrastructure disruption
   - Motivation: Strategic intelligence
   - Capability: Very high

### Attack Vectors

1. **API Vulnerabilities**
   - SQL injection (mitigated by Supabase RLS)
   - Authentication bypass
   - Authorization flaws
   - Rate limiting evasion

2. **Client-Side Attacks**
   - XSS (Cross-Site Scripting)
   - CSRF (Cross-Site Request Forgery)
   - Clickjacking

3. **Data Leakage**
   - Insecure file storage
   - Logging sensitive data
   - Error messages exposing system details

4. **Infrastructure Attacks**
   - Credential theft
   - Dependency vulnerabilities
   - Misconfigured cloud resources

---

## Security Controls

### 1. Authentication & Authorization

#### Current Implementation (Demo Mode)
- ✅ Placeholder authentication ("Demo User")
- ✅ Row Level Security policies enforced
- ⚠️ No actual user authentication

#### Production Requirements
- ❌ Supabase Auth integration
- ❌ Multi-factor authentication (MFA)
- ❌ Role-based access control (RBAC)
- ❌ Session management
- ❌ Password policies

**Supabase Auth Integration Plan:**

```typescript
// packages/db/auth.ts
import { createClient } from '@supabase/supabase-js';

export async function getCurrentUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('User not authenticated');
  }

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  return user;
}

export async function requireOrgAccess(orgId: string) {
  const user = await requireAuth();
  const orgs = await getUserOrgIds(user.id);

  if (!orgs.includes(orgId)) {
    throw new Error('User does not have access to this organization');
  }

  return user;
}
```

**Risk Level:** 🔴 Critical (Production Blocker)

### 2. Data Protection

#### Row Level Security (RLS)

**Implementation:** ✅ Fully Implemented

All tables with organizational data enforce RLS:

```sql
-- Example: pa_request table policy
CREATE POLICY "Users can only access their org's PA requests"
ON pa_request
FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));
```

**Protected Tables:**
- ✅ organizations
- ✅ org_member
- ✅ patient
- ✅ provider
- ✅ clinical_order
- ✅ pa_request
- ✅ checklist_item
- ✅ medical_necessity_summary
- ✅ attachment
- ✅ status_event
- ✅ audit_log

**Shared Tables (No RLS):**
- ✅ payer (reference data)
- ✅ policy_snippet (reference data)

**Risk Level:** 🟢 Low (Well Implemented)

#### Encryption

**Current State:**
- ✅ TLS in transit (Supabase + Vercel HTTPS)
- ⚠️ No encryption at rest (Supabase free tier)
- ❌ No column-level encryption

**Production Requirements:**
- Supabase Pro tier with encryption at rest
- Consider column-level encryption for:
  - patient.name
  - patient.dob
  - patient.member_id
  - clinical_notes_text

**Example Column Encryption:**

```sql
-- Using pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt patient name
UPDATE patient
SET name = pgp_sym_encrypt(name, current_setting('app.encryption_key'));

-- Decrypt in queries
SELECT
  id,
  pgp_sym_decrypt(name::bytea, current_setting('app.encryption_key')) as name,
  dob
FROM patient;
```

**Risk Level:** 🟡 Medium (PHI Protection)

#### PHI Handling

**Current State (Demo Mode):**
- ✅ No real PHI (all demo data)
- ✅ De-identified patient data
- ✅ No SSN or full DOB

**Production Requirements:**
- Implement HIPAA-compliant PHI handling
- Minimum necessary principle
- PHI access logging (audit_log)
- Data retention policies
- Secure deletion procedures

**Risk Level:** 🟡 Medium (Compliance Requirement)

### 3. API Security

#### Input Validation

**Current State:**
- ⚠️ Basic validation (TypeScript types)
- ❌ No request body schema validation
- ❌ No rate limiting

**Production Requirements:**

```typescript
// API route with validation
import { z } from 'zod';

const CreatePARequestSchema = z.object({
  patient_id: z.string().uuid(),
  order_id: z.string().uuid(),
  payer_id: z.string().uuid(),
  priority: z.enum(['standard', 'urgent']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreatePARequestSchema.parse(body);
    // ... proceed with validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    // ...
  }
}
```

**Risk Level:** 🟡 Medium (Input Validation)

#### Rate Limiting

**Current State:**
- ❌ No rate limiting

**Production Requirements:**

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }

  return NextResponse.next();
}
```

**Risk Level:** 🟡 Medium (DoS Prevention)

#### CORS Configuration

**Current State:**
- ✅ Next.js default CORS (same-origin)

**Production Checklist:**
- [ ] Define allowed origins
- [ ] Configure CORS headers
- [ ] Implement preflight handling

**Risk Level:** 🟢 Low (Default Secure)

### 4. Audit Logging

#### Current Implementation

**Status:** ✅ Implemented

All critical actions are logged to `audit_log` table:

```typescript
// Example audit log entry
await supabaseAdmin.from('audit_log').insert({
  org_id: pa.org_id,
  user_id: user.id,
  action: 'pa_request.submitted',
  subject: 'pa_request',
  subject_id: paId,
  meta_json: {
    status: 'submitted',
    priority: pa.priority,
  },
});
```

**Logged Actions:**
- PA request creation, update, deletion, submission
- Attachment uploads and deletions
- User authentication events (TODO)
- Policy changes (TODO)
- Configuration changes (TODO)

**Risk Level:** 🟢 Low (Well Implemented)

#### Log Retention

**Current State:**
- ⚠️ Indefinite retention (no cleanup job)

**Production Requirements:**
- Define retention period (7 years for HIPAA)
- Implement log archival
- Secure log deletion after retention

**Risk Level:** 🟡 Medium (Compliance)

### 5. Dependency Management

#### Vulnerability Scanning

**Current State:**
```bash
npm audit
# 6 vulnerabilities (5 moderate, 1 critical)
```

**Production Requirements:**
- [ ] Address all critical vulnerabilities
- [ ] Implement automated vulnerability scanning (Dependabot)
- [ ] Regular dependency updates
- [ ] Security patch process

**Risk Level:** 🔴 High (Known Vulnerabilities)

#### Supply Chain Security

**Current State:**
- ✅ package-lock.json for reproducible builds
- ❌ No dependency signing verification
- ❌ No SBOM (Software Bill of Materials)

**Production Requirements:**
- Use `npm ci` for reproducible installs
- Enable npm audit in CI/CD
- Consider using Snyk or similar tools

**Risk Level:** 🟡 Medium (Supply Chain)

### 6. Infrastructure Security

#### Environment Variables

**Current State:**
- ✅ .env.example provided
- ⚠️ No environment variable validation at runtime

**Production Requirements:**

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
```

**Risk Level:** 🟡 Medium (Configuration Management)

#### Secrets Management

**Current State:**
- ⚠️ Secrets in .env files (not committed)
- ❌ No secrets rotation

**Production Requirements:**
- Use Vercel Environment Variables
- Implement secrets rotation policy
- Consider HashiCorp Vault for sensitive keys

**Risk Level:** 🟡 Medium (Secrets Management)

#### Cloud Configuration

**Platform:** Vercel + Supabase

**Security Checklist:**
- [ ] Enable Vercel authentication protection
- [ ] Configure Supabase IP allowlist
- [ ] Enable Supabase database backups
- [ ] Set up monitoring and alerting
- [ ] Configure security headers

**Security Headers:**

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

**Risk Level:** 🟡 Medium (Infrastructure Hardening)

---

## HIPAA Compliance

### Covered Requirements

**Status:** ⚠️ Partial (Demo Mode)

#### Administrative Safeguards
- [ ] Security Management Process
- [ ] Assigned Security Responsibility
- [ ] Workforce Security
- [ ] Information Access Management
- [ ] Security Awareness and Training
- [ ] Security Incident Procedures
- [ ] Contingency Plan
- [ ] Business Associate Agreements

#### Physical Safeguards
- ✅ Facility Access Controls (Cloud provider)
- ✅ Workstation Use (Cloud provider)
- ✅ Device and Media Controls (Cloud provider)

#### Technical Safeguards
- ✅ Access Control (RLS implemented)
- ⚠️ Audit Controls (partially implemented)
- ✅ Integrity (database constraints)
- ✅ Transmission Security (TLS)

### Production Requirements

1. **Sign Business Associate Agreement (BAA) with:**
   - Supabase (database)
   - Vercel (hosting)
   - Anthropic (LLM processing)

2. **Implement PHI Access Controls:**
   - User authentication and authorization
   - Role-based permissions
   - Minimum necessary access

3. **Enable Comprehensive Audit Logging:**
   - All PHI access events
   - Authentication events
   - Configuration changes
   - Failed access attempts

4. **Data Breach Response Plan:**
   - Incident detection procedures
   - Breach notification process (60 days)
   - Mitigation procedures

5. **Regular Risk Assessments:**
   - Annual security assessment
   - Vulnerability scanning
   - Penetration testing

---

## Security Monitoring

### Recommended Monitoring

1. **Authentication Anomalies**
   - Failed login attempts
   - Unusual login locations
   - Multiple concurrent sessions

2. **Data Access Patterns**
   - Bulk PHI exports
   - After-hours access
   - Access to records unrelated to user's patients

3. **System Health**
   - API error rates
   - Database connection issues
   - Storage quota warnings

4. **Security Events**
   - SQL injection attempts
   - Rate limit violations
   - Unauthorized API calls

### Alerting Thresholds

```typescript
// Recommended alert rules
const ALERT_RULES = {
  failed_logins: {
    threshold: 5,
    window: '5 minutes',
    action: 'Lock account',
  },
  bulk_export: {
    threshold: 100, // records
    window: '1 hour',
    action: 'Admin notification',
  },
  api_errors: {
    threshold: 10,
    window: '1 minute',
    action: 'Engineering notification',
  },
};
```

---

## Security Checklist

### Pre-Production Checklist

#### Authentication & Authorization
- [ ] Integrate Supabase Auth
- [ ] Implement MFA
- [ ] Configure session timeouts
- [ ] Set up password policies
- [ ] Test RLS policies

#### Data Protection
- [ ] Enable encryption at rest
- [ ] Implement column-level encryption for PHI
- [ ] Configure database backups
- [ ] Set up data retention policies
- [ ] Test data deletion procedures

#### API Security
- [ ] Add input validation (Zod schemas)
- [ ] Implement rate limiting
- [ ] Configure CORS
- [ ] Add security headers
- [ ] Test API endpoints for vulnerabilities

#### Compliance
- [ ] Sign BAAs with vendors
- [ ] Document PHI handling procedures
- [ ] Create incident response plan
- [ ] Conduct security training
- [ ] Perform risk assessment

#### Monitoring & Audit
- [ ] Set up error tracking (Sentry)
- [ ] Configure log aggregation
- [ ] Create alert rules
- [ ] Test incident response
- [ ] Document audit procedures

#### Infrastructure
- [ ] Review cloud configurations
- [ ] Implement secrets rotation
- [ ] Set up disaster recovery
- [ ] Configure backups
- [ ] Document infrastructure

---

## Recommendations

### High Priority (Pre-Production)

1. **Implement Authentication** (Critical)
   - Integrate Supabase Auth
   - Add MFA support
   - Configure session management

2. **Address Dependency Vulnerabilities** (Critical)
   - Run `npm audit fix`
   - Update vulnerable packages
   - Set up automated scanning

3. **Add Input Validation** (High)
   - Implement Zod schemas for all API routes
   - Validate file uploads
   - Sanitize user inputs

4. **Implement Rate Limiting** (High)
   - Protect API endpoints
   - Prevent brute force attacks
   - Monitor for anomalies

### Medium Priority (Post-Launch)

1. **Enhanced Audit Logging**
   - Log all PHI access
   - Implement log retention
   - Create audit reports

2. **Security Monitoring**
   - Set up Sentry or similar
   - Configure alerts
   - Create dashboards

3. **HIPAA Compliance**
   - Sign BAAs
   - Document procedures
   - Conduct training

### Low Priority (Ongoing)

1. **Penetration Testing**
   - Annual security audit
   - Third-party assessment
   - Bug bounty program

2. **Security Enhancements**
   - Consider zero-trust architecture
   - Implement anomaly detection
   - Advanced threat protection

---

## Conclusion

Greenlight PA has a **strong security foundation** with Row Level Security, comprehensive audit logging, and type-safe codebase. The system is well-architected for multi-tenant healthcare data.

**Critical Action Items Before Production:**
1. Integrate user authentication
2. Address dependency vulnerabilities
3. Implement input validation and rate limiting
4. Sign Business Associate Agreements
5. Enable encryption at rest

**Estimated Timeline to Production-Ready Security:** 2-3 weeks

**Next Steps:**
1. Review and approve this assessment
2. Prioritize security tasks
3. Assign security responsibilities
4. Schedule follow-up assessment

---

**Document Version:** 1.0
**Last Review:** 2025-10-17
**Next Review:** 2025-11-17 (30 days)
**Owner:** Security Team / Engineering Lead
