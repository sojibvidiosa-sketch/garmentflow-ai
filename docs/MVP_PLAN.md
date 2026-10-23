# GarmentFlow AI — 12-Screen MVP Plan

Screen numbers match the Figma file (`00 · Product Map`).
"P1 ✅" = built in Phase 1 on demo data. Backend columns describe what later phases add.

---

## B. Screen-by-screen build plan

### 01 · Landing Page — `/` — P1 ✅
- **Components:** SiteHeader, hero, product preview, 5-step "How it works", 6 feature cards, 3 pricing cards (content from Figma screens 02–03).
- **Interactions:** Book a demo (mailto, `NEXT_PUBLIC_CONTACT_EMAIL`), Explore demo workspace, anchor nav.
- **Backend / DB / AI:** none for MVP. (Phase 2 option: demo-request form → `leads` table.)
- **States:** static page; no loading/error needed.

### 05 · Login — `/login` (+ `/forgot-password`) — P1 UI ✅, Auth = Phase 2
- **Components:** LoginForm (email, password + show/hide), ResetForm.
- **Interactions:** validation (zod), forgot password, contact support.
- **Endpoints:** Server Actions `signIn`, `requestPasswordReset`, `/auth/callback` (Supabase PKCE), `/auth/confirm`, `signOut`.
- **DB:** `auth.users`, `profiles`, `company_memberships`.
- **States:** field errors ✅, invalid credentials, unverified email, locked/rate-limited, loading button.

### 07 · Main Dashboard — `/dashboard` — P1 ✅
- **Components:** 4 MetricCards (active, in production, overdue milestones, pending AI reviews), order pipeline chart, upcoming critical dates, team activity, attention needed.
- **Interactions:** cards link to filtered lists; rows link to PO details.
- **Endpoints:** server component queries (aggregate SQL view `dashboard_metrics`).
- **DB:** purchase_orders, milestones, audit_logs/activity, notifications.
- **AI:** none (numbers are computed, never AI).
- **States:** skeleton ✅, empty lists ✅, error boundary ✅.

### 08 · Purchase Orders — `/orders` — P1 ✅
- **Components:** search, buyer + status filters, sortable data table, pagination, CSV export, empty states.
- **Interactions:** search/filter/sort/paginate ✅, top-bar search `?q=` ✅, row → details ✅, CSV ✅.
- **Endpoints (Phase 3):** server-side search/filter/pagination via query params; `createPurchaseOrder` action (manual entry form).
- **DB:** purchase_orders, buyers, po_items.
- **States:** loading ✅, no results ✅, no orders yet ✅, error ✅.

### 09 · New Order / Document Upload — `/orders/new` — P1 UI ✅, processing = Phase 4
- **Components:** tabs (Upload / Paste email), drag-and-drop zone, file card, email textarea, "what happens next".
- **Interactions:** type + size validation ✅ (PDF/PNG/JPEG ≤ 10 MB), remove file ✅, submit.
- **Endpoints:** `POST /api/documents/upload-url` (signed URL), `POST /api/extractions` (creates `ai_jobs` row, runs extraction), `GET /api/extractions/:id` (status polling).
- **DB:** documents, ai_jobs, extraction_results, ai_usage.
- **AI:** OpenAI extraction with Structured Outputs.
- **States:** invalid file ✅, processing (spinner + status), unreadable/scanned PDF, AI failure with retry, quota reached.

### 10 · AI Extraction & Review — `/orders/review/[jobId]` — P1 UI ✅ (sample only)
- **Components:** source document panel with highlight, field list with confidence + source quote, missing-info notice, editable colour × size grid with total check, special instructions, confirmation checkbox.
- **Interactions:** edit ✅, click field → highlight source ✅, reset ✅, approve with validation ✅ (blocks missing required fields and unconfirmed review).
- **Endpoints:** `approveExtraction` server action → transaction creating `purchase_orders` + `po_items` + breakdown, links document, writes `audit_logs`, optionally creates T&A from template.
- **DB:** extraction_results, purchase_orders, po_items, po_item_breakdown, audit_logs.
- **AI:** displays stored AI output; no AI call on approve.
- **States:** missing fields ✅, quantity mismatch ✅, saving, conflict (PO number exists), success.

### 11 · Purchase Order Details — `/orders/[id]` — P1 ✅ (read-only)
- **Components:** header with status, order info, style cards with breakdown tables, T&A timeline, documents, notes, activity.
- **Interactions:** draft email (links to 17 with PO pre-selected) ✅; edit order / change status / assign merchandiser / add note = Phase 3.
- **Endpoints:** `updatePurchaseOrder`, `updateStatus`, `addNote`, `GET signed URL` for documents.
- **DB:** purchase_orders, po_items, milestones, documents, order_revisions, audit_logs.
- **States:** not found ✅, no T&A plan ✅, no documents ✅, unsaved changes (Phase 3).

### 13 · T&A Tracker — `/tna` — P1 ✅ (read-only)
- **Components:** KPIs, buyer + attention filters, PO × 9-milestone matrix (colour = deadline state), milestone detail modal.
- **Interactions:** filter ✅, open milestone ✅; edit dates / assign / mark complete / notes = Phase 5.
- **Endpoints:** `createPlanFromTemplate`, `updateMilestone`, `completeMilestone`.
- **DB:** milestones, tna_templates, tna_template_steps, audit_logs.
- **AI:** none — dates proposed from template offsets, always user-reviewed.
- **States:** empty filter ✅, saving, permission denied for viewers.

### 15 · Delay Alerts — `/alerts` — P1 ✅
- **Components:** severity tabs, alert rows (icon, milestone, PO link, buyer, reason, responsible person, severity), mark read / all read, hide read.
- **Interactions:** filter ✅, mark read (in-memory in P1) ✅.
- **Endpoints:** `/api/cron/deadlines` (Vercel Cron, secret header) → upsert `notifications`; `markRead` action.
- **DB:** notifications, milestones, purchase_orders.
- **AI:** none (deterministic rules, unit-tested).
- **States:** no alerts ✅, all read ✅.

### 17 · AI Email Composer — `/email` — P1 UI ✅, AI = Phase 7
- **Components:** PO / purpose / recipient / tone selectors, extra notes, "order facts used" panel, subject + body editor.
- **Interactions:** standard template ✅ (labelled "not AI-generated"), edit ✅, copy ✅; Generate with AI + Save draft = Phase 7.
- **Endpoints:** `POST /api/ai/email-draft`, `saveEmailDraft`.
- **DB:** email_drafts, ai_jobs, ai_usage.
- **AI:** OpenAI drafting from approved order facts only. Never sends email.
- **States:** clipboard blocked ✅, generating, AI error with template fallback, quota reached.

### 18 · Reports & Order Summary — `/reports` — P1 ✅
- **Components:** report tabs (PO summary, pending, completed, overdue, upcoming shipments, team), summary tiles, table, CSV, print/PDF.
- **Interactions:** switch report ✅, CSV (formula-injection safe) ✅, print ✅; AI narrative = Phase 7.
- **Endpoints:** server-side report queries; `POST /api/ai/report-summary`.
- **DB:** purchase_orders, milestones, profiles, audit_logs, reports.
- **AI:** narrative only, given the computed figures; numbers never AI-generated.
- **States:** empty report ✅.

### 21 · Basic Admin Dashboard — `/admin` — P1 ✅
- **Components:** KPIs (companies, users, AI jobs + cost, failed jobs), companies table with plan/subscription, recent AI jobs with errors, privacy notice.
- **Endpoints:** server-only aggregates via service role; `platform_admins` check in `proxy.ts` + server.
- **DB:** companies, subscriptions, company_memberships, ai_jobs, ai_usage, audit_logs.
- **States:** no access (non-admins get 404), empty lists.

---

## E. Implementation checklist (dependency order)

**Phase 1 — Foundation** ✅
- [x] Next.js 16 + TypeScript + Tailwind 4 + ESLint + Vitest
- [x] Design tokens from Figma, Inter font
- [x] UI kit, app shell, responsive sidebar/drawer, loading/empty/error/not-found states
- [x] Data-access layer with labelled demo dataset
- [x] All 12 MVP screens on demo data; client interactions that need no backend
- [x] Deterministic deadline rules, reports, CSV, upload validation + 18 unit tests

**Phase 2 — Supabase & Auth** (code ✅, waiting for your Supabase + Vercel accounts — see `docs/GO_LIVE.md`)
- [x] Migrations for all tables, RLS policies + helper functions, storage bucket + policies, audit trigger
- [x] RLS test suite in PGlite: cross-company read/write, child rows, membership escalation, viewer role, storage, platform admin, anon (10 tests)
- [x] `@supabase/ssr` clients, `proxy.ts` route protection, sign up / sign in / sign out / reset / new password, email confirm route
- [x] Onboarding (create workspace), live data layer for every screen, "Load sample data" for new workspaces
- [ ] Invite teammates UI + company switcher (backend RPC `accept_invitation` ready)
- [ ] Apply migrations on the real Supabase project and smoke-test sign-up end to end

**Phase 3: Purchase orders** ✅ create/edit form with styles and colour × size grid, status changes, delete, buyer directory, atomic save RPC.

**Phase 4: OpenAI extraction** ✅ signed direct-to-storage uploads, document center, structured-output extraction with evidence quotes, AI job tracking (tokens, cost), monthly quota, stored review, approval creates the order and links the document.

**Phase 5: T&A** ✅ plan from template (dates stay editable), edit and complete milestones from the tracker, order page and My Tasks; changes recorded in history.

**Phase 6: Alerts** ✅ deterministic rules computed on each visit; per-user read state saved; bell shows unread urgent alerts. (A daily email digest is a later option.)

**Phase 7: Email & reports AI** ✅ AI drafts from server-loaded order facts, saved drafts, report narrative from computed figures.

**Phase 8: Admin** ✅ companies, subscriptions with editable limits, AI usage and cost, processing jobs with errors, support log and demo requests, all metadata-only.

**Team & settings** ✅ invitations, roles, suspend/remove (always one admin), seat/PO limits per plan, profile, password, workspace switcher.

**Phase 9: Hardening & launch** ✅ security headers, robots.txt, privacy/terms drafts, 16 RLS tests (also run on real Supabase Postgres), 26 unit tests, browser sweep of all 29 routes at desktop and phone width. Remaining: your 10-minute launch test on the real Supabase project (`docs/GO_LIVE.md`), legal review, SMTP provider.

---

## F. Budget-aware plan (target < BDT 50,000)

Figures are estimates (≈ BDT 122 per USD, October 2026 list prices; check before buying).

### Monthly running cost once a paying pilot starts
| Item | Plan | USD/mo | ≈ BDT/mo |
|---|---|---|---|
| Vercel | Pro (Hobby plan forbids commercial use) | 20 | 2,440 |
| Supabase | Pro (free tier pauses after inactivity, no backups) | 25 | 3,050 |
| OpenAI API | pay-as-you-go, ~500 extractions + 1,000 drafts | 5–20 | 600–2,400 |
| Domain (.com) | yearly ≈ BDT 1,500 | ~1 | ~125 |
| Email sending (auth emails) | Resend/Postmark free tier | 0 | 0 |
| **Total** | | **≈ 51–66** | **≈ 6,200–8,000** |

During development (before paying customers) Vercel Hobby + Supabase Free cost **BDT 0**; only OpenAI usage (≈ BDT 500–1,000 for testing).

### What fits in BDT 50,000
- ✅ **All 12 MVP screens, phases 1–9**, if development continues with AI-assisted engineering (this workflow) and you act as product owner/tester.
- ✅ ~6 months of production hosting for a controlled pilot (3–5 buying houses).
- ✅ Domain, basic monitoring (Sentry free), daily DB backups (Supabase Pro).

### Needs additional budget / resources
- ⚠️ **Scanned-PDF OCR** at scale (OpenAI vision works but costs more per page; dedicated OCR service later).
- ⚠️ **Payment gateway** (SSLCommerz/bKash) and automated billing — manual invoicing for the pilot.
- ⚠️ **Independent security review / penetration test** before onboarding many customers (recommended, typically BDT 50k+ alone).
- ⚠️ **Human developer time** for long-term maintenance, on-call and customer support.
- ⚠️ Remaining 14 Phase-2 screens (Documents, My Tasks, Buyers, Team, Settings, admin sub-pages, etc.).
- ⚠️ Email sending from inside the app, Gmail/Outlook integration, mobile app.
