# GarmentFlow AI

AI-assisted merchandising workspace for garment buying houses: purchase orders, buyer-document extraction with human review, T&A tracking, deadline alerts, email drafting and management reports.

> **Status: all 26 screens built.** Without Supabase keys the app runs as a demo on a clearly labelled **fictional dataset**. With Supabase + OpenAI keys (see [`docs/GO_LIVE.md`](docs/GO_LIVE.md)) it is the full platform: accounts, private company workspaces protected by Row Level Security, purchase orders, document upload with AI extraction and human approval, T&A, tasks, alerts, AI email drafts, reports, team, settings and platform admin.

## Quick start

Requirements: Node.js 20.9+ (22 LTS recommended), npm.

```bash
npm install
cp .env.example .env.local   # leave Supabase values empty for demo mode
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest): deadline rules, reports, CSV safety, validation, AI reply checking, and database security (RLS) tests against the real migrations |
| `TEST_DATABASE_URL=… npm run test:db` | Run the security tests against a real Supabase Postgres |

## Live demo (GitHub Pages)

`npm run build:demo` writes a fully static copy of the demo to `out/`. The workflow `.github/workflows/deploy-demo.yml` runs lint + tests, builds it and publishes it to GitHub Pages on every push to `main`.

One-time setup: repository **Settings → Pages → Source: GitHub Actions**. Free GitHub accounts can use Pages only on public repositories.

## Screens (Figma numbering)

| # | Screen | Route | # | Screen | Route |
|---|---|---|---|---|---|
| 01–03 | Landing, features, pricing | `/` | 14 | My tasks | `/tasks` |
| 04 | Contact & demo booking | `/contact` | 15 | Delay alerts | `/alerts` |
| 05 | Login / sign up | `/login`, `/signup` | 16 | Buyer directory | `/buyers` |
| 06 | Password recovery | `/forgot-password` | 17 | AI email composer | `/email` |
| 07 | Main dashboard | `/dashboard` | 18 | Reports | `/reports` |
| 08 | Purchase orders (+ create/edit) | `/orders` | 19 | Team | `/team` |
| 09 | New order / upload | `/orders/new` | 20 | Company settings | `/settings` |
| 10 | AI extraction & review | `/orders/review/[job]` | 21 | Platform admin | `/admin` |
| 11 | Purchase order details | `/orders/[id]` | 22 | Companies | `/admin/companies` |
| 12 | Document center | `/documents` | 23 | Subscriptions | `/admin/subscriptions` |
| 13 | T&A tracker | `/tna` | 24 | AI usage & cost | `/admin/ai-usage` |
|  |  |  | 25 | Processing jobs | `/admin/jobs` |
|  |  |  | 26 | Support & logs | `/admin/support` |

## Documentation
- [`docs/GO_LIVE.md`](docs/GO_LIVE.md) — connect Supabase + Vercel for real accounts and data
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture, folder structure, database & security model
- [`docs/MVP_PLAN.md`](docs/MVP_PLAN.md) — per-screen plan, dependency-ordered checklist, budget
- [`docs/DESIGN_AUDIT.md`](docs/DESIGN_AUDIT.md) — what was taken from Figma and what was corrected

## Tech stack
Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + RLS, Auth, Storage) · OpenAI Responses API with structured outputs · Zod · Vitest · Vercel.
