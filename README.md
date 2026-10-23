# GarmentFlow AI

AI-assisted merchandising workspace for garment buying houses: purchase orders, buyer-document extraction with human review, T&A tracking, deadline alerts, email drafting and management reports.

> **Current status: Phase 1 — frontend foundation.** All 12 MVP screens run on a clearly labelled **fictional demo dataset**. There is no login, database, file storage or AI connection yet; buttons that need them are disabled and say which phase enables them. Do not enter real customer data.

## Quick start

Requirements: Node.js 20.9+ (22 LTS recommended), npm.

```bash
npm install
cp .env.example .env.local   # optional in Phase 1
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) — deadline rules, reports, CSV safety, validation |

## Screens (Figma numbering)

| # | Screen | Route |
|---|---|---|
| 01 | Landing page | `/` |
| 05 | Login (+ password recovery) | `/login`, `/forgot-password` |
| 07 | Main dashboard | `/dashboard` |
| 08 | Purchase orders | `/orders` |
| 09 | New order / document upload | `/orders/new` |
| 10 | AI extraction & review (sample) | `/orders/review/sample` |
| 11 | Purchase order details | `/orders/po-1061` |
| 13 | T&A tracker | `/tna` |
| 15 | Delay alerts | `/alerts` |
| 17 | AI email composer | `/email` |
| 18 | Reports & order summary | `/reports` |
| 21 | Platform admin dashboard | `/admin` |

## Documentation
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture, folder structure, database & security model
- [`docs/MVP_PLAN.md`](docs/MVP_PLAN.md) — per-screen plan, dependency-ordered checklist, budget
- [`docs/DESIGN_AUDIT.md`](docs/DESIGN_AUDIT.md) — what was taken from Figma and what was corrected

## Tech stack
Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Lucide icons · Zod · Vitest. Planned: Supabase (Postgres, Auth, Storage), OpenAI API, Vercel + Vercel Cron.
