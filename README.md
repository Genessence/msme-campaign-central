<div align="center">
	<h1>MSME Campaign Central</h1>
	<p><strong>Amber Compliance System</strong> – Manage MSME vendor data, run communication / data collection campaigns, track responses & compliance metrics.</p>
</div>

## Overview

MSME Campaign Central is a React + Supabase powered dashboard for:

- Creating & managing MSME status update / compliance campaigns
- Distributing email / WhatsApp templates (via Supabase Edge Functions)
- Collecting vendor responses & uploaded documents
- Tracking progress with real‑time metrics & activity feed
- Auditing problematic vendor data via upload validation logs

## Tech Stack

| Area | Technology |
|------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn-ui, Radix Primitives, Tailwind CSS |
| State / Data Fetching | React Query (@tanstack/react-query) |
| Forms & Validation | react-hook-form, zod |
| Backend (BaaS) | Supabase (Postgres, Auth, Edge Functions) |
| Auth | Supabase email/password (persisted sessions) |
| Charts | Recharts |
| File Handling | Supabase Storage (implied) / custom tables |

## Quick Start

Prerequisites: Node.js 18+, npm or bun, Supabase project (or use public fallback keys for read-only demo).

```bash
git clone <REPO_URL>
cd msme-campaign-central
cp .env.example .env   # Add your Supabase project values
npm install            # or bun install / pnpm i
npm run dev
```

The app will start on the port Vite assigns (usually http://localhost:5173).

## Environment Variables

All client-exposed vars are prefixed with `VITE_`:

```
VITE_SUPABASE_URL= https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY= <public-anon-key>
```

The code currently includes fallback values (for continuity). Define your own values in `.env` to override. Remove fallbacks before production hand‑off.

## Project Structure (selected)

```
src/
	pages/                 # Route-level components (Dashboard, Campaigns, Vendors, Templates, etc.)
	components/            # Reusable UI + domain widgets (sidebar, submissions table)
	hooks/                 # Custom hooks: auth, metrics, upload logs
	integrations/supabase/ # Generated types + client wrapper
	assets/                # Static images
supabase/
	functions/             # Edge Functions (execute-campaign, sending logic)
	migrations/            # SQL migrations defining schema
```

## Key Domain Tables

| Table | Purpose |
|-------|---------|
| vendors | Master vendor registry + MSME attributes |
| msme_campaigns | Campaign definitions (links to templates / forms) |
| msme_responses | High-level tracking of vendor response status |
| custom_forms / form_fields / form_responses | Dynamic form builder + submissions |
| email_templates / whatsapp_templates | Communication content with variable placeholders |
| campaign_email_sends | Audit of outbound email sends |
| document_uploads | Uploaded vendor documents per campaign |
| upload_logs | Validation errors from bulk vendor uploads |
| profiles | User profile metadata (roles, names) |

Enum highlights: `campaign_status (Draft|Active|Completed|Cancelled)`, `response_status (Pending|Completed|Partial|Failed)`, `msme_category`, `msme_status`.

## Auth Flow

`useAuth` sets up a Supabase listener (`supabase.auth.onAuthStateChange`) and persists sessions via localStorage. Protected routes wrap pages and redirect unauthenticated users to `/auth`.

## Metrics & Dashboard

`useDashboardMetrics` aggregates counts (vendors, active campaigns, MSME vendors, pending responses) plus a merged recent activity feed from campaigns, vendors, and responses, refreshing every 30s.

## Upload Validation

Bulk vendor uploads create entries in `upload_logs` for invalid emails / phones. The Dashboard exposes a clear logs action (mutation + toast feedback).

## Supabase Client

`src/integrations/supabase/client.ts` now reads from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` with a console warning when fallbacks are used. Types are generated in `types.ts` enabling end‑to‑end type safety.

## Edge Functions (supabase/functions)

Contains server-side logic (e.g., `execute-campaign`, `send-campaign-email`, `send-campaign-whatsapp`). Deploy via the Supabase CLI:

```bash
supabase functions deploy execute-campaign
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Development-mode build (with dev optimizations) |
| `npm run preview` | Preview built app |
| `npm run lint` | Run ESLint |

## Development Workflow

1. Create / update tables via SQL migrations (`supabase/migrations`).
2. Generate updated TypeScript types (if using Supabase codegen) – not currently scripted; add a script if desired.
3. Build features in `pages` + domain hooks.
4. Keep forms & templates generic; use variables for substitution in campaign execution.
5. Add tests (future enhancement – none present yet).

## Suggested Next Enhancements

- Add unit/integration tests (React Testing Library + Vitest)
- Add role-based authorization guard in `useAuth`
- Implement soft deletion / archival for campaigns
- Add activity feed table instead of dynamic composition
- CLI script to regenerate Supabase types

## Deployment

You can still manage via Lovable UI if desired. For manual deploys:

1. Ensure `.env` is populated in the hosting environment.
2. Run `npm run build`.
3. Serve `dist/` via static hosting (Netlify, Vercel, Cloudflare Pages, etc.).
4. Deploy/upgrade Supabase Edge Functions as needed.

## Security Notes

- Never expose `service_role` keys to the client.
- Consider enabling RLS (Row Level Security) and writing policies (not shown in this repo snapshot).
- Remove fallback anon key before production if repository becomes public.

## Contributing

Open a PR with a clear description. Keep changes scoped and run `npm run lint` before submission.

## License

Internal project (add license text if this will be distributed externally).

---
Maintained by the Amber / Genessence team.
