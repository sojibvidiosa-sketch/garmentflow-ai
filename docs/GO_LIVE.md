# Going live with real accounts and data

The same code runs in two modes:

| Mode | When | What works |
|---|---|---|
| **Demo** | No Supabase keys (GitHub Pages site) | All screens on fictional data, nothing saved |
| **Live** | Supabase keys set (Vercel) | Sign up, sign in, password reset, private company workspace, data saved, sample data loader |

Live mode needs two free accounts: **Supabase** (database + login) and **Vercel** (hosting that can run server code — GitHub Pages cannot).

---

## Step 1 — Supabase (≈10 minutes)

1. Go to https://supabase.com → **Start your project** → sign in with GitHub.
2. **New project**: name `garmentflow`, choose a strong database password (save it), region **Southeast Asia (Singapore)**, plan **Free**.
3. When it is ready, open **SQL Editor → New query**. Paste the whole file
   `supabase/migrations/20261023000001_core_schema.sql` and click **Run**. Then do the same with
   `supabase/migrations/20261023000002_storage.sql`. Both should say "Success".
4. Open **Project Settings → API Keys** and copy:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **Publishable key** (starts with `sb_publishable_`)

   These two are safe to share with the developer. **Never share the secret key or the database password in chat.**

## Step 2 — Vercel (≈5 minutes)

1. Go to https://vercel.com → **Sign up** → **Continue with GitHub** (Hobby plan is fine for testing; Pro is required once customers pay).
2. **Add New → Project** → import `sojibvidiosa-sketch/garmentflow-ai`.
3. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1.4 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key from step 1.4 |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` (Vercel shows it after the first deploy — add it then and redeploy) |

4. Click **Deploy**. Your live app is at `https://<your-project>.vercel.app`.

## Step 3 — Connect the two (≈2 minutes)

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://<your-project>.vercel.app`
- **Redirect URLs**: add `https://<your-project>.vercel.app/auth/confirm`

In Supabase → **Authentication → Emails → Templates**, edit **Confirm signup** and **Reset password** so the button link is:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next={{ .RedirectTo }}
```

(For Reset password use `&next=/reset-password` at the end instead of `{{ .RedirectTo }}`.)

> Supabase's built-in email sender is limited to a few emails per hour — fine for testing. Before the pilot, connect a free email provider (e.g. Resend) under **Authentication → Emails → SMTP Settings**.

## Step 4 — Try it

1. Open the Vercel link → **Open app** → you are sent to **Sign in** → **Create a workspace**.
2. Confirm the email, name your buying house, then click **Load sample data** on the dashboard.
3. Every screen now shows *your* workspace's data, stored in Supabase.

## Optional — make yourself platform admin

In Supabase **SQL Editor** (replace the email):

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'you@yourcompany.com';
```

---

## What is still demo-only in live mode

| Feature | Phase |
|---|---|
| Create / edit purchase orders by hand, change status, notes | 3 |
| Real document upload + OpenAI extraction (needs an OpenAI API key) | 4 |
| Editing milestones, marking complete | 5 |
| Saved notification read state, daily deadline job | 6 |
| AI email drafting, saved drafts, AI report summary | 7 |
| Cross-company admin metrics | 8 |
