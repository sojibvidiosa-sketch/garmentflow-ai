-- GarmentFlow AI — operations: tasks, alert read state, plan limits,
-- invitations for invitees, atomic order saves, T&A plans, demo requests,
-- and platform-admin reporting (metadata only, never order contents).

-- ---------------------------------------------------------------- tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  po_id uuid references public.purchase_orders (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  assignee_id uuid references auth.users (id) on delete set null,
  due_date date,
  done_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.tasks (company_id, assignee_id);
create trigger tasks_company before insert or update on public.tasks for each row execute function public.check_same_company();
alter table public.tasks enable row level security;
create policy tasks_select on public.tasks for select to authenticated using (public.is_member(company_id));
create policy tasks_insert on public.tasks for insert to authenticated with check (public.can_edit(company_id));
create policy tasks_update on public.tasks for update to authenticated using (public.can_edit(company_id)) with check (public.can_edit(company_id));
create policy tasks_delete on public.tasks for delete to authenticated using (public.can_edit(company_id));

-- ---------------------------------------------------------------- alert read state
-- Alerts are computed from milestones on each visit; this only remembers
-- which ones each person has read.
create table public.alert_reads (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  alert_id text not null check (length(alert_id) <= 200),
  read_at timestamptz not null default now(),
  primary key (user_id, alert_id)
);
alter table public.alert_reads enable row level security;
create policy alert_reads_own on public.alert_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(company_id));

-- ai_jobs are updated by the server, acting as the requesting user.
create policy ai_jobs_update on public.ai_jobs for update to authenticated
  using (public.can_edit(company_id)) with check (public.can_edit(company_id));

-- ---------------------------------------------------------------- plan limits
create function public.enforce_seat_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  seats int;
begin
  select seat_limit into seats from public.subscriptions where company_id = new.company_id;
  if seats is not null and (select count(*) from public.company_memberships where company_id = new.company_id and status = 'active') >= seats then
    raise exception 'seat limit reached for this plan';
  end if;
  return new;
end $$;
create trigger memberships_seat_limit before insert on public.company_memberships for each row execute function public.enforce_seat_limit();

create function public.enforce_po_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lim int;
begin
  select po_limit into lim from public.subscriptions where company_id = new.company_id;
  if lim is not null and (select count(*) from public.purchase_orders
      where company_id = new.company_id and status not in ('shipped', 'cancelled')) >= lim then
    raise exception 'active purchase order limit reached for this plan';
  end if;
  return new;
end $$;
create trigger purchase_orders_limit before insert on public.purchase_orders for each row execute function public.enforce_po_limit();

-- A company must always keep at least one active Company Admin.
create function public.keep_one_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid := coalesce(old.company_id, new.company_id);
begin
  if exists (select 1 from public.companies where id = cid) and not exists (
    select 1 from public.company_memberships
    where company_id = cid and role = 'company_admin' and status = 'active'
  ) then
    raise exception 'a company needs at least one active Company Admin';
  end if;
  return null;
end $$;
create constraint trigger memberships_keep_admin after update or delete on public.company_memberships
  deferrable initially immediate for each row execute function public.keep_one_admin();

-- ---------------------------------------------------------------- invitations for invitees
create function public.my_invitations()
returns table (id uuid, company_name text, role public.member_role, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, c.name, i.role, i.expires_at
  from public.invitations i join public.companies c on c.id = i.company_id
  where i.accepted_at is null and i.expires_at > now()
    and i.email = lower((select email from auth.users where id = auth.uid()))
$$;

-- ---------------------------------------------------------------- atomic order save
-- Creates or updates a purchase order and replaces its items in one
-- transaction. SECURITY INVOKER: the caller's RLS rights apply.
create function public.save_purchase_order(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  pid uuid := nullif(p ->> 'id', '')::uuid;
  cid uuid := (p ->> 'company_id')::uuid;
  item jsonb;
  pos int := 0;
begin
  if pid is null then
    insert into public.purchase_orders (company_id, po_number, buyer_id, season, status, order_date, ship_date, currency,
      unit_price, merchandiser_id, notes, special_instructions)
    values (cid, trim(p ->> 'po_number'), nullif(p ->> 'buyer_id', '')::uuid, coalesce(p ->> 'season', ''),
      coalesce(nullif(p ->> 'status', ''), 'confirmed')::public.po_status, nullif(p ->> 'order_date', '')::date,
      nullif(p ->> 'ship_date', '')::date, coalesce(nullif(p ->> 'currency', ''), 'USD'), nullif(p ->> 'unit_price', '')::numeric,
      nullif(p ->> 'merchandiser_id', '')::uuid, coalesce(p ->> 'notes', ''), coalesce(p ->> 'special_instructions', ''))
    returning id into pid;
  else
    update public.purchase_orders set
      po_number = trim(p ->> 'po_number'),
      buyer_id = nullif(p ->> 'buyer_id', '')::uuid,
      season = coalesce(p ->> 'season', ''),
      status = coalesce(nullif(p ->> 'status', ''), status::text)::public.po_status,
      order_date = nullif(p ->> 'order_date', '')::date,
      ship_date = nullif(p ->> 'ship_date', '')::date,
      currency = coalesce(nullif(p ->> 'currency', ''), 'USD'),
      unit_price = nullif(p ->> 'unit_price', '')::numeric,
      merchandiser_id = nullif(p ->> 'merchandiser_id', '')::uuid,
      notes = coalesce(p ->> 'notes', ''),
      special_instructions = coalesce(p ->> 'special_instructions', '')
    where id = pid and company_id = cid;
    if not found then raise exception 'purchase order not found'; end if;
    delete from public.po_items where po_id = pid;
  end if;

  for item in select * from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    insert into public.po_items (company_id, po_id, style_no, description, fabric, gsm, colors, position)
    values (cid, pid, coalesce(item ->> 'style_no', ''), coalesce(item ->> 'description', ''), coalesce(item ->> 'fabric', ''),
      nullif(item ->> 'gsm', '')::int, coalesce(item -> 'colors', '[]'::jsonb), pos);
    pos := pos + 1;
  end loop;
  return pid;
end $$;

-- Builds a T&A plan from a template relative to the order's ship date.
-- Existing milestones are kept; planned dates stay editable afterwards.
create function public.create_tna_plan(order_id uuid, template_id uuid default null) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  po public.purchase_orders;
  tpl public.tna_templates;
  step jsonb;
  added int := 0;
begin
  select * into po from public.purchase_orders where id = order_id;
  if not found then raise exception 'purchase order not found'; end if;
  if po.ship_date is null then raise exception 'set a ship date before creating the T&A plan'; end if;
  select * into tpl from public.tna_templates
  where company_id = po.company_id and (id = template_id or (template_id is null and is_default))
  order by is_default desc limit 1;
  if not found then raise exception 'no T&A template found'; end if;

  for step in select * from jsonb_array_elements(tpl.steps) loop
    insert into public.milestones (company_id, po_id, key, planned_date, assignee_id, priority)
    values (po.company_id, po.id, (step ->> 'key')::public.milestone_key, po.ship_date + (step ->> 'offset_days')::int,
      po.merchandiser_id, case when step ->> 'key' in ('fabric_inhouse', 'shipment') then 'high' else 'normal' end::public.priority)
    on conflict (po_id, key) do nothing;
    if found then added := added + 1; end if;
  end loop;
  return added;
end $$;

-- ---------------------------------------------------------------- demo requests (public site)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company text not null,
  phone text not null default '',
  team_size text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
create policy leads_admin_read on public.leads for select to authenticated using (public.is_platform_admin());

create function public.submit_lead(full_name text, email text, company text, phone text, team_size text, message text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(full_name)) < 2 or position('@' in email) < 2 or length(trim(company)) < 2 then
    raise exception 'invalid demo request';
  end if;
  if (select count(*) from public.leads l where l.email = lower(trim(submit_lead.email)) and l.created_at > now() - interval '1 day') >= 3 then
    raise exception 'too many requests';
  end if;
  insert into public.leads (full_name, email, company, phone, team_size, message)
  values (left(trim(full_name), 120), lower(left(trim(email), 200)), left(trim(company), 160), left(trim(phone), 40),
    left(trim(team_size), 40), left(trim(message), 2000));
end $$;

-- ---------------------------------------------------------------- platform admin reporting
create function public.assert_platform_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'platform admins only'; end if;
end $$;

create function public.admin_companies()
returns table (id uuid, name text, created_at timestamptz, plan text, status text, seat_limit int, po_limit int, ai_job_limit int,
  members bigint, active_pos bigint, ai_jobs_30d bigint, ai_cost_30d numeric, failed_jobs_30d bigint, last_activity timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_platform_admin();
  return query
  select c.id, c.name, c.created_at, s.plan, s.status, s.seat_limit, s.po_limit, s.ai_job_limit,
    (select count(*) from public.company_memberships m where m.company_id = c.id and m.status = 'active'),
    (select count(*) from public.purchase_orders p where p.company_id = c.id and p.status not in ('shipped', 'cancelled')),
    (select count(*) from public.ai_jobs j where j.company_id = c.id and j.created_at > now() - interval '30 days'),
    (select coalesce(sum(j.cost_usd), 0) from public.ai_jobs j where j.company_id = c.id and j.created_at > now() - interval '30 days'),
    (select count(*) from public.ai_jobs j where j.company_id = c.id and j.status = 'failed' and j.created_at > now() - interval '30 days'),
    (select max(a.created_at) from public.audit_logs a where a.company_id = c.id)
  from public.companies c left join public.subscriptions s on s.company_id = c.id
  order by c.created_at desc;
end $$;

create function public.admin_ai_jobs(max_rows int default 100)
returns table (id uuid, company_name text, kind public.ai_job_kind, status public.ai_job_status, model text, error text,
  input_tokens int, output_tokens int, cost_usd numeric, created_at timestamptz, finished_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_platform_admin();
  return query
  select j.id, c.name, j.kind, j.status, j.model, j.error, j.input_tokens, j.output_tokens, j.cost_usd, j.created_at, j.finished_at
  from public.ai_jobs j join public.companies c on c.id = j.company_id
  order by j.created_at desc limit least(max_rows, 500);
end $$;

-- Activity metadata only: no field values, so no order contents leak.
create function public.admin_activity(max_rows int default 100)
returns table (company_name text, action text, target_type text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_platform_admin();
  return query
  select c.name, a.action, a.target_type, a.created_at
  from public.audit_logs a left join public.companies c on c.id = a.company_id
  order by a.created_at desc limit least(max_rows, 500);
end $$;

create function public.admin_update_subscription(cid uuid, new_plan text, new_status text, seats int, pos int, ai_jobs int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_platform_admin();
  update public.subscriptions set plan = new_plan, status = new_status, seat_limit = seats, po_limit = pos, ai_job_limit = ai_jobs, updated_at = now()
  where company_id = cid;
  insert into public.audit_logs (company_id, actor_id, action, target_type, target_id, meta)
  values (cid, auth.uid(), 'update', 'subscriptions', cid, jsonb_build_object('plan', new_plan, 'status', new_status));
end $$;

-- ---------------------------------------------------------------- grants
grant select, insert, update, delete on public.tasks, public.alert_reads to authenticated;
grant select on public.leads to authenticated;
revoke all on function public.submit_lead(text, text, text, text, text, text) from public;
grant execute on function public.submit_lead(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.my_invitations(), public.save_purchase_order(jsonb), public.create_tna_plan(uuid, uuid),
  public.admin_companies(), public.admin_ai_jobs(int), public.admin_activity(int),
  public.admin_update_subscription(uuid, text, text, int, int, int) to authenticated;
revoke execute on function public.assert_platform_admin(), public.enforce_seat_limit(), public.enforce_po_limit(), public.keep_one_admin() from public;

-- Supabase's default privileges grant new tables to anon; take that back.
revoke all on public.tasks, public.alert_reads, public.leads from anon;
grant usage on schema public to anon;
