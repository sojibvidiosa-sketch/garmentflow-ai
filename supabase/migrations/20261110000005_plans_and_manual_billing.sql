-- Plans (Free / Starter / Business) and manual bKash billing.
-- Payments are NOT collected automatically: a Company Admin sends money by
-- bKash, submits the transaction ID, and a platform admin checks it against
-- the bKash statement before the plan is activated.

create table public.plans (
  key text primary key,
  name text not null,
  price_bdt int not null check (price_bdt >= 0),
  seat_limit int not null check (seat_limit > 0),
  po_limit int not null check (po_limit > 0),
  ai_job_limit int not null check (ai_job_limit >= 0),
  self_serve boolean not null default true,
  position int not null default 0
);
insert into public.plans (key, name, price_bdt, seat_limit, po_limit, ai_job_limit, self_serve, position) values
  ('free', 'Free', 0, 2, 10, 20, true, 1),
  ('starter', 'Starter', 2999, 5, 60, 300, true, 2),
  ('business', 'Business', 6999, 15, 300, 1500, true, 3),
  ('pilot', 'Pilot', 0, 5, 50, 300, false, 8),
  ('enterprise', 'Enterprise', 0, 50, 2000, 3000, false, 9);
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to anon, authenticated using (true);
grant select on public.plans to anon, authenticated;

-- New companies start on Free.
alter table public.subscriptions drop constraint subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_fkey foreign key (plan) references public.plans (key);
alter table public.subscriptions
  alter column plan set default 'free',
  alter column status set default 'active',
  alter column seat_limit set default 2,
  alter column po_limit set default 10,
  alter column ai_job_limit set default 20;

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plan text not null references public.plans (key),
  amount_bdt int not null check (amount_bdt > 0),
  method text not null default 'bkash' check (method in ('bkash')),
  sender_number text not null check (sender_number ~ '^01[3-9][0-9]{8}$'),
  trx_id text not null check (trx_id ~ '^[A-Z0-9]{8,12}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text not null default '',
  submitted_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trx_id)
);
create index on public.payment_requests (company_id, created_at desc);
alter table public.payment_requests enable row level security;
-- Company Admins read their own company's payment history. All writes go through the functions below.
create policy payment_requests_select on public.payment_requests for select to authenticated
  using (public.has_role(company_id, array['company_admin']::public.member_role[]));
grant select on public.payment_requests to authenticated;

create function public.submit_payment_request(cid uuid, plan_key text, sender text, trx text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  p public.plans;
  rid uuid;
begin
  if not public.has_role(cid, array['company_admin']::public.member_role[]) then
    raise exception 'only a Company Admin can submit a payment';
  end if;
  select * into p from public.plans where key = plan_key and self_serve and price_bdt > 0;
  if not found then raise exception 'this plan cannot be paid for here'; end if;
  if (select count(*) from public.payment_requests where company_id = cid and status = 'pending') >= 2 then
    raise exception 'a payment is already waiting for verification';
  end if;
  insert into public.payment_requests (company_id, plan, amount_bdt, sender_number, trx_id, submitted_by)
  values (cid, p.key, p.price_bdt, trim(sender), upper(trim(trx)), auth.uid())
  returning id into rid;
  insert into public.audit_logs (company_id, actor_id, action, target_type, target_id, meta)
  values (cid, auth.uid(), 'create', 'payment_requests', rid, jsonb_build_object('plan', p.key, 'amount_bdt', p.price_bdt));
  return rid;
end $$;

create function public.admin_payment_requests(max_rows int default 200)
returns table (id uuid, company_id uuid, company_name text, plan text, amount_bdt int, sender_number text, trx_id text,
  status text, review_note text, created_at timestamptz, reviewed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_platform_admin();
  return query
  select r.id, r.company_id, c.name, r.plan, r.amount_bdt, r.sender_number, r.trx_id, r.status, r.review_note, r.created_at, r.reviewed_at
  from public.payment_requests r join public.companies c on c.id = r.company_id
  order by (r.status = 'pending') desc, r.created_at desc limit least(max_rows, 500);
end $$;

-- Approving activates the plan for 30 days from today, or extends a period that is still running.
create function public.admin_review_payment(request_id uuid, approve boolean, note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.payment_requests;
  p public.plans;
begin
  perform public.assert_platform_admin();
  select * into r from public.payment_requests where id = request_id and status = 'pending' for update;
  if not found then raise exception 'payment request not found or already reviewed'; end if;
  update public.payment_requests
  set status = case when approve then 'approved' else 'rejected' end, review_note = left(coalesce(note, ''), 300),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = r.id;
  if approve then
    select * into p from public.plans where key = r.plan;
    update public.subscriptions
    set plan = p.key, status = 'active', seat_limit = p.seat_limit, po_limit = p.po_limit, ai_job_limit = p.ai_job_limit,
        period_end = greatest(coalesce(period_end, current_date), current_date) + 30, updated_at = now()
    where company_id = r.company_id;
  end if;
  insert into public.audit_logs (company_id, actor_id, action, target_type, target_id, meta)
  values (r.company_id, auth.uid(), case when approve then 'approve' else 'reject' end, 'payment_requests', r.id,
    jsonb_build_object('plan', r.plan, 'amount_bdt', r.amount_bdt));
end $$;

create or replace function public.admin_update_subscription(cid uuid, new_plan text, new_status text, seats int, pos int, ai_jobs int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_platform_admin();
  if new_status not in ('trialing', 'active', 'past_due', 'cancelled') then raise exception 'invalid status'; end if;
  update public.subscriptions set plan = new_plan, status = new_status, seat_limit = seats, po_limit = pos, ai_job_limit = ai_jobs, updated_at = now()
  where company_id = cid;
  insert into public.audit_logs (company_id, actor_id, action, target_type, target_id, meta)
  values (cid, auth.uid(), 'update', 'subscriptions', cid, jsonb_build_object('plan', new_plan, 'status', new_status));
end $$;

revoke execute on function public.submit_payment_request(uuid, text, text, text), public.admin_payment_requests(int),
  public.admin_review_payment(uuid, boolean, text) from public, anon;
grant execute on function public.submit_payment_request(uuid, text, text, text), public.admin_payment_requests(int),
  public.admin_review_payment(uuid, boolean, text) to authenticated;
