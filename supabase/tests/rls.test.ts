/**
 * Runs the real migrations in an in-memory Postgres (PGlite) with a minimal
 * stand-in for Supabase's auth/storage schemas, then checks that one
 * company can never read or change another company's data.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to authenticated;
  grant select, insert, delete on storage.objects to authenticated;
`;

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const VIEWER = "00000000-0000-0000-0000-00000000000c";

let db: PGlite;
let companyA: string;
let companyB: string;
let poB: string;

/** Run SQL as a signed-in user, the way PostgREST does for Supabase. */
async function as<T = Record<string, unknown>>(userId: string, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.exec("set local role authenticated");
    return (await tx.query<T>(sql, params)).rows;
  });
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(__dirname, "..", "migrations");
  for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(join(dir, file), "utf8"));

  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'a@a.test', '{"full_name":"Alice A"}'), ($2, 'b@b.test', '{"full_name":"Bob B"}'), ($3, 'v@a.test', '{}')`,
    [A, B, VIEWER],
  );
  companyA = (await as<{ id: string }>(A, `select public.create_company('Alpha Sourcing') as id`))[0]!.id;
  companyB = (await as<{ id: string }>(B, `select public.create_company('Bravo Buying') as id`))[0]!.id;
  // Alice invites a read-only viewer into company A.
  await as(A, `insert into public.company_memberships (company_id, user_id, role) values ($1, $2, 'viewer')`, [companyA, VIEWER]);

  await as(A, `insert into public.purchase_orders (company_id, po_number) values ($1, 'A-1')`, [companyA]);
  poB = (await as<{ id: string }>(B, `insert into public.purchase_orders (company_id, po_number, status) values ($1, 'B-1', 'confirmed') returning id`, [companyB]))[0]!.id;
}, 60_000);

describe("multi-company isolation (RLS)", () => {
  it("creates a profile, admin membership, subscription and T&A template on signup", async () => {
    const rows = await as<{ role: string }>(A, `select role from public.company_memberships where user_id = $1`, [A]);
    expect(rows).toEqual([{ role: "company_admin" }]);
    expect(await as(A, `select 1 from public.subscriptions where company_id = $1`, [companyA])).toHaveLength(1);
    expect(await as(A, `select 1 from public.tna_templates where company_id = $1`, [companyA])).toHaveLength(1);
    expect((await as<{ full_name: string }>(A, `select full_name from public.profiles where id = $1`, [A]))[0]?.full_name).toBe("Alice A");
  });

  it("each user sees only their own company's orders", async () => {
    expect((await as<{ po_number: string }>(A, `select po_number from public.purchase_orders`)).map((r) => r.po_number)).toEqual(["A-1"]);
    expect((await as<{ po_number: string }>(B, `select po_number from public.purchase_orders`)).map((r) => r.po_number)).toEqual(["B-1"]);
    expect(await as(A, `select * from public.companies where id = $1`, [companyB])).toEqual([]);
  });

  it("blocks writing into another company", async () => {
    await expect(as(A, `insert into public.purchase_orders (company_id, po_number) values ($1, 'evil')`, [companyB])).rejects.toThrow(/row-level security/);
    // Updates/deletes on invisible rows silently affect nothing.
    expect(await as(A, `update public.purchase_orders set notes = 'x' where id = $1 returning id`, [poB])).toEqual([]);
    expect(await as(A, `delete from public.purchase_orders where id = $1 returning id`, [poB])).toEqual([]);
  });

  it("blocks attaching children to another company's order", async () => {
    await expect(
      as(A, `insert into public.milestones (company_id, po_id, key, planned_date) values ($1, $2, 'shipment', '2026-12-01')`, [companyA, poB]),
    ).rejects.toThrow(/different company/);
  });

  it("blocks adding yourself to another company", async () => {
    await expect(
      as(A, `insert into public.company_memberships (company_id, user_id, role) values ($1, $2, 'company_admin')`, [companyB, A]),
    ).rejects.toThrow(/row-level security/);
  });

  it("viewers can read but not write", async () => {
    expect(await as(VIEWER, `select po_number from public.purchase_orders`)).toHaveLength(1);
    await expect(as(VIEWER, `insert into public.purchase_orders (company_id, po_number) values ($1, 'V-1')`, [companyA])).rejects.toThrow(/row-level security/);
    expect(await as(VIEWER, `update public.purchase_orders set notes = 'x' returning id`)).toEqual([]);
  });

  it("records an audit trail with the acting user and changed fields", async () => {
    await as(A, `update public.purchase_orders set status = 'confirmed' where po_number = 'A-1'`);
    const logs = await as<{ action: string; actor_id: string; meta: Record<string, unknown> }>(
      A,
      `select action, actor_id, meta from public.audit_logs where target_type = 'purchase_orders' order by id`,
    );
    expect(logs.map((l) => l.action)).toEqual(["insert", "update"]);
    expect(logs[1]!.actor_id).toBe(A);
    expect(logs[1]!.meta).toHaveProperty("status");
    // Company B's log is invisible to A, and nobody can rewrite history.
    expect(await as(B, `select 1 from public.audit_logs where company_id = $1`, [companyA])).toEqual([]);
    expect(await as(A, `delete from public.audit_logs returning id`)).toEqual([]);
  });

  it("isolates stored files by company folder", async () => {
    await as(A, `insert into storage.objects (bucket_id, name) values ('documents', $1)`, [`${companyA}/doc/po.pdf`]);
    await expect(as(A, `insert into storage.objects (bucket_id, name) values ('documents', $1)`, [`${companyB}/doc/x.pdf`])).rejects.toThrow(/row-level security/);
    expect(await as(B, `select name from storage.objects`)).toEqual([]);
    expect(await as(A, `select name from storage.objects`)).toHaveLength(1);
  });

  it("gives platform admins no automatic access to company data", async () => {
    await db.query(`insert into public.platform_admins (user_id) values ($1)`, [B]);
    expect(await as(B, `select po_number from public.purchase_orders where company_id = $1`, [companyA])).toEqual([]);
  });

  it("signed-out (anon) requests read nothing", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      return tx.query(`select * from public.purchase_orders`).then((r) => r.rows).catch((e: Error) => e.message);
    });
    expect(rows).toMatch(/permission denied/);
  });
});
