/**
 * Checks that one company can never read or change another company's data.
 *
 * Default: runs the real migrations in an in-memory Postgres (PGlite) with a
 * minimal stand-in for Supabase's auth/storage schemas.
 * With TEST_DATABASE_URL set: runs against a real Supabase Postgres that
 * already has the migrations applied (test rows are cleaned up first).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface Tx {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}
interface Db extends Tx {
  transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
  close(): Promise<void>;
}

function pgliteDb(): Db {
  const lite = new PGlite();
  return {
    query: (sql, params) => lite.query(sql, params),
    exec: (sql) => lite.exec(sql),
    transaction: (fn) => lite.transaction((tx) => fn({ query: (sql, params) => tx.query(sql, params), exec: (sql) => tx.exec(sql) })),
    close: () => lite.close(),
  };
}

function realDb(url: string): Db {
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  return {
    query: async <T,>(sql: string, params?: unknown[]) => (await pool.query(sql, params)) as unknown as { rows: T[] },
    exec: (sql) => pool.query(sql),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({ query: async <T,>(sql: string, params?: unknown[]) => (await client.query(sql, params)) as unknown as { rows: T[] }, exec: (sql) => client.query(sql) });
        await client.query("commit");
        return result;
      } catch (e) {
        await client.query("rollback");
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

const REAL_DB = process.env.TEST_DATABASE_URL;

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

let db: Db;
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
  if (REAL_DB) {
    db = realDb(REAL_DB);
    await db.exec(`
      truncate public.companies, public.leads, public.platform_admins cascade;
      set storage.allow_delete_query = 'true';
      delete from storage.objects where bucket_id = 'documents';
      delete from auth.users where email like '%.test';`);
  } else {
    db = pgliteDb();
    await db.exec(SUPABASE_STUB);
    const dir = join(__dirname, "..", "migrations");
    for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(join(dir, file), "utf8"));
  }

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

afterAll(() => db?.close());

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

  it("saves an order with items atomically and builds a T&A plan from the template", async () => {
    const payload = {
      company_id: companyA,
      po_number: "A-2",
      ship_date: "2026-12-20",
      merchandiser_id: A,
      items: [{ style_no: "PLS-1", description: "Polo", fabric: "Cotton", gsm: "220", colors: [{ color: "Navy", sizes: [{ size: "M", qty: 100 }] }] }],
    };
    const id = (await as<{ id: string }>(A, `select public.save_purchase_order($1::jsonb) as id`, [JSON.stringify(payload)]))[0]!.id;
    expect(await as(A, `select style_no from public.po_items where po_id = $1`, [id])).toEqual([{ style_no: "PLS-1" }]);
    // Updating replaces items.
    await as(A, `select public.save_purchase_order($1::jsonb)`, [JSON.stringify({ ...payload, id, items: [{ style_no: "PLS-2" }, { style_no: "PLS-3" }] })]);
    expect((await as(A, `select style_no from public.po_items where po_id = $1 order by position`, [id])).map((r) => r.style_no)).toEqual(["PLS-2", "PLS-3"]);
    // Another company cannot update it through the RPC.
    await expect(as(B, `select public.save_purchase_order($1::jsonb)`, [JSON.stringify({ ...payload, id, company_id: companyA })])).rejects.toThrow();

    expect((await as<{ n: number }>(A, `select public.create_tna_plan($1) as n`, [id]))[0]!.n).toBe(9);
    const ship = await as<{ planned_date: string }>(A, `select planned_date::text from public.milestones where po_id = $1 and key = 'shipment'`, [id]);
    expect(ship[0]!.planned_date).toBe("2026-12-20");
    // Running it again adds nothing.
    expect((await as<{ n: number }>(A, `select public.create_tna_plan($1) as n`, [id]))[0]!.n).toBe(0);
  });

  it("keeps at least one Company Admin and enforces seat limits", async () => {
    await expect(as(A, `update public.company_memberships set role = 'viewer' where user_id = $1 and company_id = $2`, [A, companyA])).rejects.toThrow(/at least one/);
    await db.query(`update public.subscriptions set seat_limit = 2 where company_id = $1`, [companyA]);
    await db.query(`insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000dd', 'd@a.test')`);
    await expect(
      as(A, `insert into public.company_memberships (company_id, user_id) values ($1, '00000000-0000-0000-0000-0000000000dd')`, [companyA]),
    ).rejects.toThrow(/seat limit/);
    await db.query(`update public.subscriptions set seat_limit = 5 where company_id = $1`, [companyA]);
  });

  it("shows invitations only to the invited email, and accepting joins the company", async () => {
    const E = "00000000-0000-0000-0000-0000000000ee";
    await db.query(`insert into auth.users (id, email) values ($1, 'erin@new.test')`, [E]);
    await as(A, `insert into public.invitations (company_id, email, role) values ($1, 'erin@new.test', 'merchandiser')`, [companyA]);
    expect(await as(B, `select * from public.my_invitations()`)).toEqual([]);
    const [inv] = await as<{ id: string; company_name: string }>(E, `select id, company_name from public.my_invitations()`);
    expect(inv!.company_name).toBe("Alpha Sourcing");
    await as(E, `select public.accept_invitation($1)`, [inv!.id]);
    expect(await as(E, `select po_number from public.purchase_orders order by po_number`)).toEqual([{ po_number: "A-1" }, { po_number: "A-2" }]);
  });

  it("keeps tasks and alert read state private to each company / user", async () => {
    await as(A, `insert into public.tasks (company_id, title) values ($1, 'Chase trims')`, [companyA]);
    expect(await as(B, `select * from public.tasks`)).toEqual([]);
    await as(A, `insert into public.alert_reads (company_id, alert_id) values ($1, 'overdue:x')`, [companyA]);
    expect(await as(VIEWER, `select * from public.alert_reads`)).toEqual([]);
    await expect(as(A, `insert into public.alert_reads (company_id, alert_id) values ($1, 'x')`, [companyB])).rejects.toThrow(/row-level security/);
  });

  it("restricts admin reports to platform admins and never returns order contents", async () => {
    await expect(as(A, `select * from public.admin_companies()`)).rejects.toThrow(/platform admins only/);
    const rows = await as<{ name: string; active_pos: number }>(B, `select name, active_pos from public.admin_companies()`); // B was made platform admin above
    expect(rows.map((r) => r.name).sort()).toEqual(["Alpha Sourcing", "Bravo Buying"]);
    const activity = await as(B, `select * from public.admin_activity(10)`);
    expect(Object.keys(activity[0]!)).toEqual(["company_name", "action", "target_type", "created_at"]);
  });

  it("accepts public demo requests but lets nobody else read them", async () => {
    await db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      await tx.query(`select public.submit_lead('Rina Das', 'rina@co.test', 'Co Ltd', '', '3-10', 'Hi')`);
    });
    expect(await as(A, `select * from public.leads`)).toEqual([]);
    expect(await as(B, `select email from public.leads`)).toEqual([{ email: "rina@co.test" }]);
  });

  it("signed-out (anon) requests read nothing", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      return tx.query(`select * from public.purchase_orders`).then((r) => r.rows).catch((e: Error) => e.message);
    });
    expect(rows).toMatch(/permission denied/);
  });
});
