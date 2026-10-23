# GarmentFlow AI — MVP Architecture

Status: **Phase 1 complete** (frontend foundation on fictional demo data). Everything below marked *Phase 2+* is designed but **not yet built**.

---

## A. How the pieces connect

```
 Browser (merchandiser)                         Vercel (hosting)
 ┌──────────────────────────┐   HTTPS   ┌────────────────────────────────────────┐
 │ Next.js pages (React)    │ ────────▶ │ Next.js server: pages + /api/* routes  │
 │ Tailwind UI, no secrets  │ ◀──────── │  1. check session (Supabase Auth)      │
 └──────────┬───────────────┘           │  2. check company membership + role    │
            │ signed upload URL         │  3. validate input, quotas, rate limit │
            │ (private, short-lived)    │  4. call DB / Storage / OpenAI         │
            ▼                           └──────┬───────────────┬──────────┬──────┘
 ┌──────────────────────────┐                  │               │          │
 │ Supabase Storage         │◀─────────────────┘               │          │
 │ private bucket, folder   │                                  ▼          ▼
 │ per company              │                 ┌──────────────────────┐ ┌──────────────┐
 └──────────────────────────┘                 │ Supabase Postgres    │ │ OpenAI API   │
                                              │ Row Level Security   │ │ (server only)│
 Vercel Cron (daily 06:00 BST) ─▶             │ on every table       │ └──────────────┘
   /api/cron/deadlines  (secret-protected)    └──────────────────────┘
   writes `notifications`
```

| Part | Responsibility | Rule |
|---|---|---|
| **Frontend** (Next.js App Router, React 19, Tailwind 4) | Screens, forms, instant validation | Holds no secrets. Browser validation is for convenience only — the server re-checks everything. |
| **Backend** (Next.js Server Components, Server Actions, Route Handlers) | Business logic, authorization, AI calls | Every request: *who are you → which company → which role → is the input valid*. |
| **Database** (Supabase Postgres) | Source of truth | Row Level Security (RLS) on every table, keyed on `company_id`. Even a bug in our code cannot read another company's rows. |
| **Auth** (Supabase Auth) | Login, invitations, password reset, sessions | Session in secure HTTP-only cookies via `@supabase/ssr`. Next.js `proxy.ts` refreshes sessions and redirects signed-out users. |
| **Storage** (Supabase Storage) | PO PDFs, tech packs | Private bucket; path `company_id/document_id/file`. Storage RLS policies mirror table RLS. Downloads use short-lived signed URLs. |
| **OpenAI API** | Extraction, email drafts, report narrative | Server-side only. Structured Outputs with a strict JSON schema; "null if not present" — never invent values. Every call logged to `ai_jobs` + `ai_usage` with tokens and cost. |
| **Scheduled jobs** (Vercel Cron) | Daily deadline scan | Pure date logic in `src/lib/domain/deadlines.ts` (already built + tested). No AI involved. |
| **Deployment** (GitHub → Vercel) | Preview per branch, production on `main` | Secrets only in Vercel environment variables. Migrations applied with the Supabase CLI. |

### Where the code already anticipates this
- `src/lib/data/index.ts` is the **only** place pages get data from. Today it returns demo data; in Phase 2 the function bodies become Supabase queries. Page code does not change.
- `src/lib/domain/types.ts` mirrors the planned table columns.
- `src/lib/domain/deadlines.ts`, `src/lib/reports.ts`, `src/lib/upload-rules.ts` are pure functions that the server, the cron job and the tests all share.

---

## C. Repository structure

```
garmentflow-ai/
├─ docs/                         Architecture, plan, design audit
├─ public/
├─ supabase/                     (Phase 2) Supabase CLI project
│  ├─ migrations/                Versioned SQL: tables, RLS, functions
│  └─ seed.sql                   Fictional demo seed for local dev
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              Root: Inter font, metadata
│  │  ├─ globals.css             Design tokens from Figma
│  │  ├─ (marketing)/            Public site: / (01), /login (05), /forgot-password (06)
│  │  ├─ (workspace)/            Signed-in company area (sidebar shell)
│  │  │  ├─ dashboard/           07
│  │  │  ├─ orders/              08 list · new/ 09 · review/[jobId] 10 · [id] 11
│  │  │  ├─ tna/                 13
│  │  │  ├─ alerts/              15
│  │  │  ├─ email/               17
│  │  │  └─ reports/             18
│  │  ├─ (platform)/admin/       21 — platform super-admin area
│  │  └─ api/                    (Phase 2+) route handlers: cron, uploads, AI
│  ├─ components/
│  │  ├─ ui/                     Button, Badge, Card, MetricCard, Field/Input/Select,
│  │  │                          Table/Pagination, Modal, EmptyState/Notice/Skeleton
│  │  ├─ layout/                 AppShell (sidebar + topbar + mobile drawer), DemoBanner
│  │  ├─ domain/                 Status / deadline / severity badges
│  │  └─ orders/ tna/ alerts/ email/ reports/ auth/   Feature components
│  ├─ lib/
│  │  ├─ data/                   Data access layer (demo now, Supabase in Phase 2)
│  │  ├─ demo/                   Fictional dataset — clearly separated
│  │  ├─ domain/                 Types, labels, deadline rules
│  │  ├─ supabase/               (Phase 2) server/browser clients
│  │  ├─ ai/                     (Phase 4) OpenAI client, schemas, prompts
│  │  └─ csv.ts reports.ts email-templates.ts upload-rules.ts orders-query.ts
│  └─ proxy.ts                   (Phase 2) session refresh + route protection
├─ .env.example
└─ vitest.config.mts
```

---

## D. Database design (Phase 2)

All tenant tables carry `company_id uuid not null` and have RLS enabled. Timestamps: `created_at`, `updated_at`. Primary keys: `uuid`.

### Tables

| Table | Key columns | Notes |
|---|---|---|
| `companies` | name, plan, status | One row per buying house. |
| `profiles` | id (= auth.users.id), full_name, avatar | 1:1 with Supabase Auth user. |
| `company_memberships` | company_id, user_id, role, status | role ∈ company_admin, merch_manager, merchandiser, viewer. A user can belong to several companies. |
| `platform_admins` | user_id | Separate from memberships → super admins get **no automatic tenant access**. |
| `invitations` | company_id, email, role, token_hash, expires_at | Invite-only signup. |
| `buyers` | company_id, name, country, contact_email | |
| `purchase_orders` | company_id, po_number, buyer_id, season, status, order_date, ship_date, currency, unit_price, merchandiser_id, notes, special_instructions, source_document_id | `unique(company_id, po_number)`. |
| `po_items` | company_id, po_id, style_no, description, fabric, gsm | Many styles per PO. |
| `po_item_breakdown` | company_id, item_id, color, size, qty | Colour × size grid. |
| `documents` | company_id, po_id?, storage_path, file_name, kind, mime, size_bytes, sha256, uploaded_by | File lives in Storage; row holds metadata. |
| `extraction_results` | company_id, document_id, ai_job_id, raw_json, reviewed_json, status, reviewed_by, reviewed_at | AI output kept separately from the approved PO. |
| `order_revisions` | company_id, po_id, changed_by, field, old_value, new_value | Written by trigger on PO update. |
| `tna_templates` / `tna_template_steps` | company_id, name / key, offset_days, order | Configurable templates; default garment template seeded. |
| `milestones` | company_id, po_id, key, planned_date, actual_date, status, assignee_id, priority, notes | |
| `tasks` | company_id, po_id?, milestone_id?, title, assignee_id, due_date, status | Free-form follow-ups (My Tasks, Phase 2 screen). |
| `notifications` | company_id, user_id, kind, severity, po_id, milestone_id, dedupe_key, read_at | `unique(dedupe_key)` so the daily job never duplicates. |
| `email_drafts` | company_id, po_id, purpose, recipient_type, tone, subject, body, ai_job_id?, created_by | Never auto-sent. |
| `reports` | company_id, kind, params, generated_by, narrative | Optional saved snapshots. |
| `ai_jobs` | company_id, kind, status, model, error, input_ref, created_by | Queue + history; failures visible in admin. |
| `ai_usage` | company_id, ai_job_id, input_tokens, output_tokens, cost_usd | Drives quotas and cost dashboard. |
| `subscriptions` | company_id, plan, status, seats, po_limit, period_end | Manual for MVP; gateway later. |
| `audit_logs` | company_id?, actor_id, action, target_type, target_id, ip, meta | Append-only (no UPDATE/DELETE policy). |

### Relationships
`companies 1─* company_memberships *─1 profiles` · `companies 1─* purchase_orders 1─* po_items 1─* po_item_breakdown` · `purchase_orders 1─* milestones`, `1─* documents`, `1─* email_drafts` · `documents 1─* extraction_results` · `ai_jobs 1─1 ai_usage`.

### Authorization model
1. **RLS (database):** helper `is_member(company_id)` and `has_role(company_id, roles[])`, both `security definer` and reading `company_memberships` for `auth.uid()`. Policies:
   - SELECT: any active member of that company.
   - INSERT/UPDATE: merchandiser and above. Viewers are read-only.
   - DELETE / membership & settings changes: company_admin only.
2. **Server checks (application):** each server action re-resolves the active company from the session (never trusts a `company_id` sent by the browser) and checks role before acting.
3. **Storage:** objects under `company_id/…`; storage policies call the same `is_member()`.
4. **Platform admins:** read aggregated, non-confidential views (`admin_company_overview`, usage, job status) through a server-only service role. They cannot read POs or documents unless a company admin grants a time-limited, audit-logged support grant.
5. **Service role key:** only used in the cron job and admin aggregates, only on the server, never in the browser bundle.

Cross-company leakage tests (Phase 9) sign in as a Company A user and attempt to read/write Company B rows, files and API routes — every attempt must fail.
