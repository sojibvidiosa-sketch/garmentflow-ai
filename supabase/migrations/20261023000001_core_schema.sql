-- GarmentFlow AI — core schema, multi-company isolation and audit trail.
--
-- Security model (see docs/ARCHITECTURE.md §D):
--   * Every tenant table has company_id and Row Level Security enabled.
--   * Access is granted only through active rows in company_memberships.
--   * Platform admins (platform_admins) get NO automatic tenant access.
--   * Helper functions are SECURITY DEFINER with an empty search_path so
--     policies cannot recurse or be hijacked.

-- ---------------------------------------------------------------- types
create type public.member_role as enum ('company_admin', 'merch_manager', 'merchandiser', 'viewer');
create type public.member_status as enum ('active', 'suspended');
create type public.po_status as enum ('draft', 'pending_review', 'confirmed', 'in_production', 'shipped', 'cancelled');
create type public.milestone_key as enum (
  'fit_sample', 'lab_dip', 'fabric_booking', 'fabric_inhouse', 'pp_sample',
  'production_start', 'inline_inspection', 'final_inspection', 'shipment'
);
create type public.milestone_status as enum ('not_started', 'in_progress', 'completed', 'blocked');
create type public.priority as enum ('low', 'normal', 'high');
create type public.document_kind as enum ('purchase_order', 'tech_pack', 'buyer_email', 'other');
create type public.ai_job_kind as enum ('extraction', 'email_draft', 'report_summary');
create type public.ai_job_status as enum ('queued', 'processing', 'succeeded', 'failed');

-- ---------------------------------------------------------------- helpers
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- identity
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 120),
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_memberships (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'merchandiser',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index on public.company_memberships (user_id);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role public.member_role not null default 'merchandiser',
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  unique (company_id, email)
);

create table public.subscriptions (
  company_id uuid primary key references public.companies (id) on delete cascade,
  plan text not null default 'pilot' check (plan in ('pilot', 'starter', 'business', 'enterprise')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  seat_limit int not null default 5 check (seat_limit > 0),
  po_limit int not null default 50 check (po_limit > 0),
  ai_job_limit int not null default 300 check (ai_job_limit >= 0),
  period_end date,
  updated_at timestamptz not null default now()
);

-- Membership checks used by every policy. SECURITY DEFINER bypasses RLS on
-- company_memberships itself, which avoids policy recursion.
create function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = cid and m.user_id = auth.uid() and m.status = 'active'
  )
$$;

create function public.has_role(cid uuid, roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = cid and m.user_id = auth.uid() and m.status = 'active' and m.role = any (roles)
  )
$$;

create function public.can_edit(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(cid, array['company_admin', 'merch_manager', 'merchandiser']::public.member_role[])
$$;

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- ---------------------------------------------------------------- business data
create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  country text not null default '',
  contact_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  po_number text not null check (length(trim(po_number)) between 1 and 60),
  buyer_id uuid references public.buyers (id) on delete set null,
  season text not null default '',
  status public.po_status not null default 'draft',
  order_date date,
  ship_date date,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  unit_price numeric(12, 4) check (unit_price is null or unit_price >= 0),
  merchandiser_id uuid references auth.users (id) on delete set null,
  notes text not null default '',
  special_instructions text not null default '',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, po_number)
);
create index on public.purchase_orders (company_id, ship_date);

create table public.po_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  style_no text not null default '',
  description text not null default '',
  fabric text not null default '',
  gsm int check (gsm is null or gsm between 1 and 2000),
  -- [{ "color": "Navy", "sizes": [{ "size": "S", "qty": 1200 }, …] }, …]
  colors jsonb not null default '[]'::jsonb check (jsonb_typeof(colors) = 'array'),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.po_items (po_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  po_id uuid references public.purchase_orders (id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  kind public.document_kind not null default 'other',
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.documents (po_id);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind public.ai_job_kind not null,
  status public.ai_job_status not null default 'queued',
  model text not null default '',
  document_id uuid references public.documents (id) on delete set null,
  error text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on public.ai_jobs (company_id, created_at desc);

create table public.extraction_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ai_job_id uuid not null references public.ai_jobs (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  raw jsonb not null,
  reviewed jsonb,
  status text not null default 'needs_review' check (status in ('needs_review', 'approved', 'rejected')),
  po_id uuid references public.purchase_orders (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tna_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  -- [{ "key": "fit_sample", "offset_days": -95 }, …] relative to ship date
  steps jsonb not null check (jsonb_typeof(steps) = 'array'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  key public.milestone_key not null,
  planned_date date not null,
  actual_date date,
  status public.milestone_status not null default 'not_started',
  assignee_id uuid references auth.users (id) on delete set null,
  priority public.priority not null default 'normal',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (po_id, key)
);
create index on public.milestones (company_id, planned_date);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  po_id uuid references public.purchase_orders (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete cascade,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  po_id uuid references public.purchase_orders (id) on delete set null,
  purpose text not null,
  recipient_type text not null,
  tone text not null,
  subject text not null default '',
  body text not null default '',
  ai_job_id uuid references public.ai_jobs (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only activity / audit trail.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  po_id uuid references public.purchase_orders (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (company_id, created_at desc);

-- ---------------------------------------------------------------- triggers
create trigger companies_updated before update on public.companies for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger buyers_updated before update on public.buyers for each row execute function public.set_updated_at();
create trigger purchase_orders_updated before update on public.purchase_orders for each row execute function public.set_updated_at();
create trigger milestones_updated before update on public.milestones for each row execute function public.set_updated_at();
create trigger email_drafts_updated before update on public.email_drafts for each row execute function public.set_updated_at();

-- Children must belong to the same company as their parent PO.
create function public.check_same_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.po_id is not null and not exists (
    select 1 from public.purchase_orders p where p.id = new.po_id and p.company_id = new.company_id
  ) then
    raise exception 'purchase order belongs to a different company';
  end if;
  return new;
end $$;
create trigger po_items_company before insert or update on public.po_items for each row execute function public.check_same_company();
create trigger milestones_company before insert or update on public.milestones for each row execute function public.check_same_company();
create trigger documents_company before insert or update on public.documents for each row execute function public.check_same_company();
create trigger email_drafts_company before insert or update on public.email_drafts for each row execute function public.check_same_company();

-- A PO's buyer must belong to the same company.
create function public.check_buyer_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.buyer_id is not null and not exists (
    select 1 from public.buyers b where b.id = new.buyer_id and b.company_id = new.company_id
  ) then
    raise exception 'buyer belongs to a different company';
  end if;
  return new;
end $$;
create trigger purchase_orders_buyer before insert or update on public.purchase_orders for each row execute function public.check_buyer_company();

-- Audit: who changed which order / milestone, and what changed.
create function public.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  changed jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if k not in ('updated_at') and to_jsonb(new) -> k is distinct from to_jsonb(old) -> k then
        changed := changed || jsonb_build_object(k, jsonb_build_object('from', to_jsonb(old) -> k, 'to', to_jsonb(new) -> k));
      end if;
    end loop;
    if changed = '{}'::jsonb then return new; end if;
  end if;
  insert into public.audit_logs (company_id, actor_id, action, target_type, target_id, po_id, meta)
  values (
    new.company_id, auth.uid(), lower(tg_op), tg_table_name, new.id,
    case when tg_table_name = 'purchase_orders' then new.id else (to_jsonb(new) ->> 'po_id')::uuid end,
    changed
  );
  return new;
end $$;
create trigger purchase_orders_audit after insert or update on public.purchase_orders for each row execute function public.audit_change();
create trigger milestones_audit after update on public.milestones for each row execute function public.audit_change();

-- New auth user → profile row.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RPCs
-- Creates a workspace with the caller as Company Admin (self-serve pilot signup).
create function public.create_company(company_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.companies where created_by = auth.uid()) >= 3 then
    raise exception 'workspace limit reached';
  end if;
  insert into public.companies (name, created_by) values (trim(company_name), auth.uid()) returning id into cid;
  insert into public.company_memberships (company_id, user_id, role) values (cid, auth.uid(), 'company_admin');
  insert into public.subscriptions (company_id) values (cid);
  insert into public.tna_templates (company_id, name, is_default, steps) values (cid, 'Standard garment T&A', true,
    '[{"key":"fit_sample","offset_days":-95},{"key":"lab_dip","offset_days":-88},{"key":"fabric_booking","offset_days":-80},
      {"key":"fabric_inhouse","offset_days":-55},{"key":"pp_sample","offset_days":-45},{"key":"production_start","offset_days":-38},
      {"key":"inline_inspection","offset_days":-20},{"key":"final_inspection","offset_days":-6},{"key":"shipment","offset_days":0}]'::jsonb);
  insert into public.audit_logs (company_id, actor_id, action, target_type, target_id) values (cid, auth.uid(), 'create', 'companies', cid);
  return cid;
end $$;

-- Accepts a pending invitation addressed to the caller's email.
create function public.accept_invitation(invitation_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations;
begin
  select * into inv from public.invitations
  where id = invitation_id and accepted_at is null and expires_at > now()
    and email = lower((select email from auth.users where id = auth.uid()));
  if not found then raise exception 'invitation not found or expired'; end if;
  insert into public.company_memberships (company_id, user_id, role) values (inv.company_id, auth.uid(), inv.role)
  on conflict (company_id, user_id) do nothing;
  update public.invitations set accepted_at = now() where id = inv.id;
  return inv.company_id;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.platform_admins enable row level security;
alter table public.invitations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.buyers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_items enable row level security;
alter table public.documents enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.extraction_results enable row level security;
alter table public.tna_templates enable row level security;
alter table public.milestones enable row level security;
alter table public.notifications enable row level security;
alter table public.email_drafts enable row level security;
alter table public.audit_logs enable row level security;

-- companies: members read; admins rename. Creation only via create_company().
create policy companies_select on public.companies for select to authenticated using (public.is_member(id));
create policy companies_update on public.companies for update to authenticated
  using (public.has_role(id, array['company_admin']::public.member_role[]))
  with check (public.has_role(id, array['company_admin']::public.member_role[]));

-- profiles: yourself, plus colleagues who share a company.
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.company_memberships mine
    join public.company_memberships theirs on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- memberships: members see their company's team; only admins change it.
create policy memberships_select on public.company_memberships for select to authenticated using (public.is_member(company_id));
create policy memberships_admin_write on public.company_memberships for all to authenticated
  using (public.has_role(company_id, array['company_admin']::public.member_role[]))
  with check (public.has_role(company_id, array['company_admin']::public.member_role[]));

-- platform_admins: only readable to check your own flag.
create policy platform_admins_self on public.platform_admins for select to authenticated using (user_id = auth.uid());

-- invitations & subscriptions: admins manage, members may read subscriptions.
create policy invitations_admin on public.invitations for all to authenticated
  using (public.has_role(company_id, array['company_admin']::public.member_role[]))
  with check (public.has_role(company_id, array['company_admin']::public.member_role[]));
create policy subscriptions_select on public.subscriptions for select to authenticated using (public.is_member(company_id));

-- Standard tenant tables: members read, editors (not viewers) write,
-- managers/admins delete.
do $$
declare
  t text;
begin
  foreach t in array array['buyers', 'purchase_orders', 'po_items', 'documents', 'extraction_results', 'tna_templates', 'milestones', 'email_drafts'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.is_member(company_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.can_edit(company_id))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.can_edit(company_id)) with check (public.can_edit(company_id))', t);
    execute format($p$create policy %1$s_delete on public.%1$s for delete to authenticated using (public.has_role(company_id, array['company_admin','merch_manager']::public.member_role[]))$p$, t);
  end loop;
end $$;

-- ai_jobs: members read; rows are written by the server on the user's behalf.
create policy ai_jobs_select on public.ai_jobs for select to authenticated using (public.is_member(company_id));
create policy ai_jobs_insert on public.ai_jobs for insert to authenticated with check (public.can_edit(company_id));

-- notifications: strictly personal.
create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid() and public.is_member(company_id));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_logs: members read; no update/delete policy exists (append-only).
create policy audit_select on public.audit_logs for select to authenticated using (public.is_member(company_id));

-- ---------------------------------------------------------------- grants
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on function public.create_company(text), public.accept_invitation(uuid),
  public.is_member(uuid), public.has_role(uuid, public.member_role[]), public.can_edit(uuid), public.is_platform_admin()
  to authenticated;
