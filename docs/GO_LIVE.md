# Launch guide: GarmentFlow AI

The same code runs in two modes:

| Mode | When | What works |
|---|---|---|
| **Demo** | No Supabase keys (the GitHub Pages site) | Every screen on fictional data. Nothing is saved. |
| **Live** | Supabase keys set (Vercel) | Real accounts, private company workspaces, all data saved, document upload + AI extraction, T&A editing, tasks, alerts, email drafts, reports, team, settings, platform admin. |

You need three accounts: **Supabase** (database, login, file storage), **Vercel** (hosting) and **OpenAI** (AI features). All have free or pay-as-you-go starts.

---

## Step 1: Supabase (about 10 minutes)

1. https://supabase.com → **Start your project** → sign in with GitHub.
2. **New project**: name `garmentflow`, a strong database password (save it in a password manager), region **Southeast Asia (Singapore)**, plan Free to start (**Pro before paying customers**: daily backups, no pausing).
3. **SQL Editor → New query**: paste and **Run** each file, in this order. Each must say "Success".
   1. `supabase/migrations/20261023000001_core_schema.sql`
   2. `supabase/migrations/20261023000002_storage.sql`
   3. `supabase/migrations/20261023000003_operations.sql`
4. **Project Settings → API Keys**: copy the **Project URL** and the **Publishable key** (`sb_publishable_…`). Never share the secret key or database password.

## Step 2: OpenAI (about 5 minutes)

1. https://platform.openai.com → sign up → **Billing**: add a payment method and a monthly limit (for example USD 20).
2. **API keys → Create new secret key**. Copy it once; you will paste it only into Vercel.

## Step 3: Vercel (about 5 minutes)

1. https://vercel.com → **Continue with GitHub**.
2. **Add New → Project** → import `sojibvidiosa-sketch/garmentflow-ai`.
3. **Environment Variables** (add before the first deploy):

   | Name | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL | public, safe |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | public, safe (RLS protects data) |
   | `OPENAI_API_KEY` | your OpenAI key | **secret, server only** |
   | `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` (or your domain) | used in email links |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | your sales email | shown on the website |
   | `NEXT_PUBLIC_DEMO_URL` | `https://sojibvidiosa-sketch.github.io/garmentflow-ai/` | optional: link to the public demo |
   | `NEXT_PUBLIC_LEGAL_NAME` | your registered company name | shown in Privacy/Terms |
   | `OPENAI_MODEL` | optional, default `gpt-4.1-mini` | must support PDF input + structured outputs |

4. **Deploy**. Add `NEXT_PUBLIC_SITE_URL` if you did not know it yet, then **Redeploy**.
5. Optional: **Settings → Domains** to add `app.yourcompany.com`.

## Step 4: Connect Supabase to your site (about 5 minutes)

Supabase → **Authentication → URL Configuration**
- **Site URL**: your site address (same as `NEXT_PUBLIC_SITE_URL`)
- **Redirect URLs**: add `https://<your-site>/auth/confirm`

Supabase → **Authentication → Emails → Templates**
- **Confirm signup**: paste the content of `supabase/templates/confirmation.html`
- **Reset password**: paste the content of `supabase/templates/recovery.html`

Supabase → **Authentication → Emails → SMTP Settings**: the built-in sender only sends a few emails per hour. Before inviting customers, connect a sending service (for example Resend, free tier) so confirmation and reset emails always arrive.

## Step 5: Make yourself platform admin

Sign up on your live site first, then in Supabase **SQL Editor** (use your email):

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'you@yourcompany.com';
```

Open `https://<your-site>/admin`. Everyone else gets "page not found" there.

## Step 6: 10-minute launch test (do this before inviting customers)

| # | Do this | Expected |
|---|---|---|
| 1 | Open the site, click **Start free pilot**, sign up | "Check your email" |
| 2 | Click the email link | Dashboard of your new workspace |
| 3 | **Load sample data** on the dashboard | Orders, T&A and alerts appear |
| 4 | **Purchase Orders → Create manually**, save | Order page opens, T&A plan created |
| 5 | **New Order / Upload**: upload a real buyer PO PDF | Review screen with extracted fields |
| 6 | Fix any field, tick the check box, **Approve** | Order created, document linked |
| 7 | **T&A Tracker**: open a date, mark complete | Cell turns green |
| 8 | **Delay Alerts**: mark one read, reload | Still read; bell count lower |
| 9 | **Email Assistant → Generate with AI**, save draft | Draft appears under Saved drafts |
| 10 | **Team**: invite a second email; sign up with it in a private window | Invitation shown; **Join** opens the same workspace |
| 11 | Sign up a third account with a new company | It sees none of the first company's data |
| 12 | `/admin` as platform admin | Companies and AI jobs listed |

If any step fails, send me the step number and the message on screen.

---

## Before you call it "launched"

- [ ] **Legal review**: have a lawyer review `/privacy` and `/terms` (drafted from how the app works, not legal advice). Confirm the 90-day deletion promise suits you.
- [ ] Supabase **Pro** plan (backups) and Vercel **Pro** (commercial use) once customers pay.
- [ ] SMTP sending service connected (Step 4).
- [ ] OpenAI monthly spend limit set.
- [ ] Pricing on the landing page confirmed.
- [ ] The 10-minute launch test passed.

## Running costs (estimate, about BDT 122/USD)

| Item | Monthly |
|---|---|
| Vercel Pro | USD 20 |
| Supabase Pro | USD 25 |
| OpenAI | about USD 0.01 per document read; USD 5–20 for a pilot |
| Email sending | free tier |
| **Total** | **about USD 50–65 ≈ BDT 6,000–8,000** |
