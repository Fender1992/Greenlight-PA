# Greenlight PA - Prior Authorization Copilot

A provider-side Prior Authorization management system for healthcare clinics to create, justify, track, and export payer-ready prior authorization packages.

## Project Status

**Phase:** Initial Setup (Section 0 Complete)
**Environment:** Development
**Demo Mode:** Enabled (No PHI)

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TailwindCSS, shadcn/ui
- **Backend:** Next.js Server Actions, Supabase
- **Database:** PostgreSQL (Supabase) with Row Level Security
- **Testing:** Vitest (unit), Playwright (e2e)
- **CI/CD:** GitHub Actions, Vercel
- **Observability:** Sentry, PostHog
- **LLM:** Anthropic Claude (feature-flagged)
- **OCR:** pdf-parse + Tesseract.js (feature-flagged)

## Monorepo Structure

```
greenlight-pa/
├── apps/
│   └── web/              # Next.js 14 app
│       ├── app/          # App router pages
│       ├── components/   # React components
│       ├── lib/          # Utilities
│       └── e2e/          # Playwright tests
├── packages/
│   ├── db/               # Supabase types, migrations, client
│   ├── llm/              # Prompt builders and LLM guards
│   ├── pdfkit/           # PDF generation templates
│   ├── ocr/              # OCR adapters
│   └── policy/           # Policy scraper/cache
├── docs/
│   ├── ADRs/             # Architecture decision records
│   ├── security/         # Security documentation
│   └── runbooks/         # Operational runbooks
└── .github/
    └── workflows/        # CI/CD pipelines
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (optional, for local development)
- Git

### One-Shot Setup

```bash
# Clone the repository
git clone https://github.com/Fender1992/Greenlight-PA.git
cd Greenlight-PA

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local

# Initialize Husky hooks
npm run prepare

# Run development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required for development
NEXT_PUBLIC_DEMO_MODE=true
ENABLE_LLM=false
ENABLE_OCR=false

# Supabase (get from https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Anthropic API (for LLM features)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Observability
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

## Development Commands

```bash
# Development
npm run dev                 # Start Next.js dev server
npm run build              # Build all packages
npm run start              # Start production server

# Code Quality
npm run lint               # Lint all workspaces
npm run typecheck          # TypeScript type checking
npm run format             # Format code with Prettier
npm run format:check       # Check formatting

# Testing
npm run test               # Run unit tests (Vitest)
npm run test:e2e           # Run e2e tests (Playwright)

# Workspace-specific
npm run dev --workspace=@greenlight/web
npm run test --workspace=@greenlight/db
```

## Feature Flags

Control features via environment variables:

- `NEXT_PUBLIC_DEMO_MODE` - Enable demo mode banner, use de-identified data
- `ENABLE_LLM` - Enable AI-powered checklist and summary generation
- `ENABLE_OCR` - Enable OCR for document text extraction

## Project Conventions

### Import Aliases

```typescript
import { Component } from "@web/components/Component";
import { supabase } from "@db/client";
import { buildChecklistPrompt } from "@llm/prompts";
import { renderCoverLetter } from "@pdfkit/templates";
import { extractText } from "@ocr/pdf";
import { normalizePolicy } from "@policy/normalizer";
```

### Code Style

- **TypeScript strict mode** everywhere
- **ESLint + Prettier** enforced via pre-commit hooks
- **Component headers** with STATUS.md reminder
- **No emojis** unless explicitly requested

### Testing

- Unit tests: `*.test.ts` files colocated with source
- E2E tests: `apps/web/e2e/*.spec.ts`
- Coverage target: 80% for core business logic

## Development Workflow

1. **Create a branch** from `main`
2. **Make changes** with frequent commits
3. **Update STATUS.md** before and after component changes
4. **Run tests** locally: `npm run test && npm run test:e2e`
5. **Push and create PR**
6. **CI checks** must pass (lint, typecheck, test, build)
7. **Merge** after review

## Database Setup

### Local Development (Supabase)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db push

# Generate TypeScript types
cd packages/db && npm run gen:types
```

### Migrations

Database migrations will be added in Section 1. They will be located in `packages/db/migrations/`.

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment Variables in Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (if using LLM features)
- `NEXT_PUBLIC_DEMO_MODE=false` (for production)

## Security

### Development (Current Phase)

- Demo mode enabled
- No PHI processed
- De-identified fixtures only

### Production Readiness

Before processing real PHI:

1. Review `docs/security/hipaa-readiness.md`
2. Ensure BAA signed with all vendors
3. Enable encryption at rest and in transit
4. Set up audit logging
5. Complete security assessment

## Troubleshooting

### Port already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module resolution errors

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Reinstall dependencies
rm -rf node_modules
npm install
```

### TypeScript errors

```bash
# Regenerate types
npm run typecheck
```

## Documentation

- **Architecture Decisions:** `docs/ADRs/`
- **Security Notes:** `docs/security/`
- **Runbooks:** `docs/runbooks/`
- **Status Tracking:** `STATUS.md`
- **Component Templates:** `COMPONENT_TEMPLATE.md`

## Contributing

1. Read `COMPONENT_TEMPLATE.md` for component structure
2. Update `STATUS.md` before and after changes
3. Follow code style conventions
4. Write tests for new features
5. Update documentation as needed

## Support

- **Issues:** https://github.com/Fender1992/Greenlight-PA/issues
- **Discussions:** https://github.com/Fender1992/Greenlight-PA/discussions

## License

Proprietary - All rights reserved

## Roadmap

### ✅ Section 0: Repo Setup & Tooling (COMPLETE)

- Monorepo structure
- Next.js 14 with App Router
- TypeScript strict mode
- ESLint + Prettier + Husky
- Vitest + Playwright
- CI pipeline
- Environment configuration

### 🔄 Section 1: Database Schema + RLS (Next)

- Supabase schema with full RLS
- Seed scripts with demo data
- TypeScript types generation
- Query SDK with guards

### ⏳ Upcoming Sections

- Section 2: API Surface & Jobs
- Section 3: LLM Prompt Builders
- Section 4: PDF Generation
- Section 5: Web App UI
- Section 6: Policy Ingestion
- Section 7: Security & Audit
- Section 8: Metrics & Nudges
- Section 9: Final Packaging

## Acknowledgments

Built with Claude Code by Anthropic
