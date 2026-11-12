# Baseline audit and Stage 0–1 status

Date: 2026-11-10 · Branch: `redesign/v2` · Base commit: `f83e986d`

Status words used here: **PASS** (ran and succeeded), **FAIL**, **BLOCKED** (needs something
outside the code), **NOT TESTED**, **NOT BUILT**.

## 1. What existed before this branch

| Area | Finding | Evidence |
| --- | --- | --- |
| Lint | PASS | `npm run lint` — no findings |
| Types | PASS | `npm run typecheck` |
| Unit + database tests | PASS, 42/42 in 4 files | `npm test` (includes Row Level Security tests on an in-memory Postgres) |
| Database design | Reusable | 3 migrations: multi-company tables, RLS on every table, audit log, plan limits, private storage bucket |
| Server logic | Reusable | Server actions for auth, orders, documents, AI, T&A, team, admin; deadline rules are plain code, not AI |
| Frontend | Rejected by the founder | Violet/dark theme taken from the old Figma file; about 26 screens at root-level addresses |
| Hosting | Static demo only | GitHub Pages workflow on `main`; no server deployment existed |

Decision: keep the backend, migrations and tests; rebuild the interface in code with a new
design system. No Figma file is used.

## 2. Inspiration material

| Material | Status |
| --- | --- |
| 13 dashboard images supplied in chat | Reviewed. Traits adopted: light-grey canvas, white sidebar with grouped section labels, 13–14px text, hairline borders, pill status badges with dots, compact KPI tiles, muted table header row |
| 9 Framer landing-page links | **BLOCKED** — the links arrived inside an attached file and the browsing tool refused them. The landing page was designed from the written rules in the brief instead. Paste the links directly in chat if a closer look is wanted |

Nothing was copied from any reference.

## 3. Stage 0 — services

| Item | Status | Notes |
| --- | --- | --- |
| Supabase project `quwullkfiggbrqcfqbht` | PASS | 4 migrations applied; 20 tables, all with RLS on |
| Supabase security advisor | Improved | First run: 10 warnings that signed-out visitors could call internal functions. Migration `20261110000004_harden_function_grants.sql` closes them (only the demo-request function stays public). Remaining warnings are the intended RLS helper functions for signed-in users |
| Local environment file | PASS | `.env.local` holds only the public URL and publishable key; it is git-ignored |
| Vercel team access | **BLOCKED** | Needs the owner to approve the access link |
| OpenAI API key | **BLOCKED** | Must be added by the owner in the host's environment settings, never in chat or in the repository |
| Email delivery (custom sender) | **BLOCKED** | Supabase's built-in sender works for testing only (strict rate limit) |
| Payment gateway | **BLOCKED** | Billing will ship as manual invoicing until a gateway is chosen |

## 4. Stage 1 — design system, shell, landing, auth

| Item | Status |
| --- | --- |
| Tokens: blue brand `#2563EB`/`#1D4ED8`, purple AI `#7C3AED`/`#6D28D9`, Inter, slate neutrals | Done (`src/app/globals.css`) |
| Primitives restyled: button (new `ai` variant), badge (new `brand`/`ai` tones), form, table, card, metric tile, states | Done |
| App shell: grouped sidebar, 56px top bar, skip link, mobile drawer; three areas (workspace, office, platform) | Done |
| Addresses moved to `/app/*`, `/office/*`, `/admin/*` with permanent redirects from the old ones | Done |
| P01 landing: nav, hero, product overview, five steps, four features, pricing, final CTA with demo form, footer | Done |
| A01–A06: login, signup, forgot password, reset password, verify email (with resend), invitation link | Done |
| Pricing display | "Pricing on request" — the BDT figures in the project brief are still proposals, so they are not shown |

### Checks run on this branch

| Check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 42/42 |
| `npm run build` (server build, real Supabase keys) | PASS |
| `npm run build:demo` (static sample-data build) | PASS |
| Horizontal overflow, landing at 1440 / 1024 / 768 / 390 / 360 | PASS (0px) after two fixes |
| Horizontal overflow, dashboard and orders at 390 | PASS |
| Signed-out visit to `/app/dashboard`, `/office/team`, `/admin` | PASS — redirected to `/login?next=…` |
| Old addresses `/dashboard`, `/orders/new`, `/team`, `/contact` | PASS — 308 to the new ones |
| Security headers on `/login` | PASS — frame, content-type, HSTS and CSP headers present |
| Wrong password against the real project | PASS — "Email or password is incorrect." |
| Empty login form | PASS — field-level validation message |
| Invitation link while signed out | PASS — asks to sign in; shows no company details |
| Full sign-up → email confirmation → workspace | NOT TESTED (needs a real inbox) |
| Accepting an invitation as the invited user | NOT TESTED |
| Screen-reader and full keyboard pass, contrast audit of every screen | NOT TESTED (tokens were chosen to meet AA; not yet measured screen by screen) |
| AI extraction against a real document | BLOCKED (no OpenAI key) |

## 5. Screen count against the 65-screen scope

| Group | Scope | Exists now | Notes |
| --- | --- | --- | --- |
| Public | 1 | 1 | |
| Auth A01–A06 | 6 | 6 | |
| Merchandiser M01–M21 | 21 | 13 | Missing: import job status, document detail, per-order T&A, buyer detail, saved drafts, profile, help, and the manual-order/edit split is partial |
| Office admin O01–O17 | 17 | 2 | Team and Settings only |
| Platform admin S01–S20 | 20 | 6 | Overview, companies, subscriptions, AI usage, jobs, support/logs |
| **Total** | **65** | **28** | The 28 existing screens now use the new design system; the inner layout of the older workspace screens still needs a screen-by-screen pass |

## 6. Database gaps to close in later stages

Company time zone and status; buyer contacts; order revision numbers for safe concurrent
editing; order status history; document versions; AI job events and idempotency keys;
notification rules; support tickets; plans, invoices and payments; feature flags; platform
staff roles; lead status; invitation emails.

## 7. Known issues carried forward

- The public contact email falls back to a placeholder until `NEXT_PUBLIC_CONTACT_EMAIL` is set.
- Invitations are created in the database but no email is sent yet; the invited person must be told to sign up, or be given the `/invite/<id>` link.
- Merging this branch to `main` will rebuild the GitHub Pages demo with the new interface. It is labelled as a sample-data preview.

## 8. Update 2026-11-12 — plans, bKash billing, Vercel

Founder decisions recorded: plans are Free, Starter ৳2,999 and Business ৳6,999 per company per month;
contact email `hellocraftkitto@gmail.com`; payments are collected manually by bKash.
The limits per plan (members / active POs / AI requests per month: 2/10/20, 5/60/300, 15/300/1,500)
are a proposal by the developer and can be changed in one migration plus `src/lib/plans.ts`.

| Item | Status |
| --- | --- |
| Migration `20261110000005_plans_and_manual_billing.sql` applied to Supabase | PASS |
| O14 Plan & billing (`/office/billing`) and S07 Payments (`/admin/billing`) | Built |
| Landing page shows the confirmed prices | Done |
| `npm test` | PASS, 44/44 (2 new database tests for plans and payments) |
| Live browser test with two temporary accounts (deleted afterwards): sign in, create company, starts on Free 2/10/20, empty form rejected, payment recorded as waiting with plan unchanged, duplicate TrxID refused, company admin cannot see platform payments, platform admin approves, company becomes Starter 5/60/300 with paid-until date, platform admin has no access to the company workspace | PASS |
| Billing page sideways scroll at 360 / 390 / 768 / 1024 | PASS after one fix |
| Automatic charging, automatic downgrade when the paid period ends, renewal reminders, invoices/receipts | NOT BUILT — a platform admin must change an expired plan by hand under Subscriptions |
| Whether the bKash number is a personal or merchant account | NOT CONFIRMED — the screen says "send to", which suits a personal number |

Screens now: 30 of 65.
