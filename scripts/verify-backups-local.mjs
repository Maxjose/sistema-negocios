// All destructive restore tests run only inside an isolated in-memory database.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "@electric-sql/pglite");
const db = new PGlite();
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await rows(sql, params))[0])[0];
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const admin=id(1), business=id(2), owner=id(3), product=id(4), method=id(5), customer=id(6), other=id(7), otherOwner=id(8), otherProduct=id(9);
let serial = 100;
async function register(snapshot, scope, kind = "manual", token = null) {
  const backup = id(serial++);
  await rows(`insert into public.business_backups(id, business_id, scope, kind, status, label, storage_path, created_by, restore_token, schema_fingerprint, captured_at)
    values($1::uuid,$2,$3,$4,'ready','QA',($1::uuid)::text,$5,$6,$7,$8)`, [backup,scope,scope ? "business" : "platform",kind,admin,token,snapshot.schema,snapshot.captured_at]);
  return backup;
}
async function begin(scope) { return scalar("select public.begin_backup_restore($1,$2)",[admin,scope]); }
async function finish(token) { await rows("select public.finish_backup_restore($1,$2)",[admin,token]); }
async function restore(token, backup, safety, snapshot) { await rows("select public.restore_business_backup($1,$2,$3,$4,$5::jsonb)",[admin,token,backup,safety,JSON.stringify(snapshot)]); }
try {
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key); create table auth.sessions(id uuid primary key, user_id uuid);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key, bucket_id text, name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;`);
  for (const file of (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql")).sort()) {
    await db.exec((await readFile(`supabase/migrations/${file}`, "utf8")).replace("create extension if not exists pgcrypto;", ""));
  }
  await db.exec(`grant usage on schema public to service_role; grant all on all sequences in schema public to service_role;
    do $$ declare t text; begin for t in select tablename from pg_tables where schemaname='public' and tablename not in ('business_backups','backup_operation') loop
      execute format('grant select, insert, update, delete on public.%I to service_role',t);
    end loop; end $$;`);
  await rows("insert into auth.users(id) values ($1),($2),($3)",[admin,owner,otherOwner]);
  await rows("insert into public.businesses(id,name,enable_customers,enable_credits,enable_multicurrency,plan_tier,plan_expires_at) values ($1,'QA Cheese',true,true,true,'unlimited',null),($2,'Other tenant',false,false,false,'unlimited',null)",[business,other]);
  await rows("insert into public.profiles(id,business_id,role,full_name,must_change_password) values($1,null,'super_admin','Admin',false),($2,$3,'owner','Owner',false),($4,$5,'owner','Other owner',false)",[admin,owner,business,otherOwner,other]);
  await rows("insert into public.products(id,business_id,name,sale_price,cost_price,stock_quantity,sale_unit) values($1,$2,'Cheese',10,6,5000,'weight'),($3,$4,'Untouched',8,3,9,'unit')",[product,business,otherProduct,other]);
  await rows("insert into public.payment_methods(id,business_id,name) values($1,$2,'Cash')",[method,business]);
  await rows("insert into public.customers(id,business_id,name) values($1,$2,'Customer')",[customer,business]);
  await rows("update public.business_currencies set rate_mode='manual',manual_rate=100,is_enabled=true where business_id=$1 and currency_code='VES'",[business]);
  await rows("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  const sale = await scalar("select public.confirm_sale_v3($1::jsonb,$2::jsonb,$3,0,'Backup test')",[JSON.stringify([{product_id:product,quantity:350,sale_unit:"weight"}]),JSON.stringify([{payment_method_id:method,amount:3.5}]),customer]);
  const credit = await scalar("select public.confirm_credit_sale($1::jsonb,$2,current_date + 10,0,'Credit backup')",[JSON.stringify([{product_id:product,quantity:1000,sale_unit:"weight"}]),customer]);
  const receivable = await scalar("select id from public.receivables where sale_id=$1",[credit]);
  await rows("select public.record_receivable_payment($1,2,$2,'Payment')",[receivable,method]);
  await rows("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
  const original = await scalar("select public.export_business_backup($1,$2)",[admin,business]);
  assert.equal(original.data.sale_items.length,2); assert.equal(original.data.receivable_payments.length,1);
  assert.equal(original.data.products[0].stock_quantity,3650);
  assert.equal(original.data.sale_exchange_rates[0].rate,'100.00000000');
  const backup = await register(original,business);
  await rows("update public.products set name='Changed', stock_quantity=2000 where id=$1",[product]);
  await rows("update public.receivables set balance=1 where id=$1",[receivable]);
  await rows("update public.businesses set plan_expires_at=now()+interval '30 days', plan_tier='basic' where id=$1",[business]);
  const lock = await begin(business);
  assert.equal(lock.snapshot.data.products[0].name,"Changed");
  assert.equal(await scalar("select public.is_maintenance_mode()"),true);
  await assert.rejects(rows("update public.products set name='Concurrent write' where id=$1",[otherProduct]),/RESTORE_IN_PROGRESS/);
  await assert.rejects(begin(other),/RESTORE_IN_PROGRESS/);
  await assert.rejects(restore(lock.token,backup,id(999),original),/SAFETY_BACKUP_REQUIRED/);
  const safety = await register(lock.snapshot,business,"safety",lock.token);
  const broken = structuredClone(original); broken.data.products[0].sale_price=-5;
  await assert.rejects(restore(lock.token,backup,safety,broken),/check constraint/);
  assert.equal(await scalar("select name from public.products where id=$1",[product]),"Changed");
  assert.equal(await scalar("select count(*) from public.sales where business_id=$1",[business]),2);
  const foreign = structuredClone(original); foreign.data.products[0].business_id=other;
  await assert.rejects(restore(lock.token,backup,safety,foreign),/CROSS_BUSINESS_BACKUP/);
  const badReference = structuredClone(original); badReference.data.sale_items[0].product_id=otherProduct;
  await assert.rejects(restore(lock.token,backup,safety,badReference),/INVALID_BACKUP_RELATIONS/);
  const changedUsers = structuredClone(original); changedUsers.data.profiles.find((p)=>p.role==='owner').business_id=other;
  await assert.rejects(restore(lock.token,backup,safety,changedUsers),/BACKUP_USERS_CHANGED/);
  await restore(lock.token,backup,safety,original);
  assert.equal(await scalar("select stock_quantity from public.products where id=$1",[product]),3650);
  assert.equal(Number(await scalar("select balance from public.receivables where id=$1",[receivable])),8);
  assert.equal(await scalar("select stock_quantity from public.products where id=$1",[otherProduct]),9);
  assert.equal(await scalar("select plan_tier from public.businesses where id=$1",[business]),"unlimited");
  assert.equal(Number(await scalar("select rate from public.sale_exchange_rates where sale_id=$1",[sale])),100);
  assert.equal(await scalar("select count(*) from public.audit_logs where action='backup.restored'"),1);
  await finish(lock.token);
  assert.equal(await scalar("select public.is_maintenance_mode()"),false);
  // The automatic safety copy can itself be restored.
  const reverseLock=await begin(business), reverseSafety=await register(reverseLock.snapshot,business,"safety",reverseLock.token);
  await restore(reverseLock.token,safety,reverseSafety,lock.snapshot); await finish(reverseLock.token);
  assert.equal(await scalar("select name from public.products where id=$1",[product]),"Changed");
  // Global replacement includes all tenants, retains admins and deactivates newer tenants.
  await rows("update public.exchange_rates set rate=9000000000.12345678 where quote_currency='COP'");
  const global=await scalar("select public.export_business_backup($1,null)",[admin]);
  assert.equal(global.data.exchange_rates.find((rate)=>rate.quote_currency==='COP').rate,'9000000000.12345678');
  const globalId=await register(global,null);
  const newer=id(300);
  await rows("insert into public.businesses(id,name) values($1,'Newer business')",[newer]);
  await rows("update public.products set name='Global change' where id=$1",[otherProduct]);
  const globalLock=await begin(null), globalSafety=await register(globalLock.snapshot,null,"safety",globalLock.token);
  await restore(globalLock.token,globalId,globalSafety,global); await finish(globalLock.token);
  assert.equal(await scalar("select status from public.businesses where id=$1",[newer]),"inactive");
  assert.equal(await scalar("select name from public.products where id=$1",[otherProduct]),"Untouched");
  assert.equal(await scalar("select rate::text from public.exchange_rates where quote_currency='COP'"),'9000000000.12345678');
  assert.equal(await scalar("select status from public.profiles where id=$1",[admin]),"active");
  assert.equal(await scalar("select count(*) from public.audit_logs where action='backup.restored'"),3);
  // RLS and service-only functions: owners cannot export, restore or read metadata.
  await rows("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await db.exec("set role authenticated");
  await assert.rejects(rows("select public.export_business_backup($1,$2)",[owner,business]),/permission denied/);
  assert.equal(await scalar("select count(*) from public.business_backups"),0);
  await assert.rejects(rows("select * from public.backup_operation"),/permission denied/);
  await db.exec("reset role");
  // Exercise the engine with the real service role, without auth schema privileges.
  await db.exec("set role service_role");
  assert.ok((await scalar("select public.export_business_backup($1,$2)",[admin,business])).data.products.length);
  await assert.rejects(rows("select public.export_business_backup($1,$2)",[owner,business]),/UNAUTHORIZED/);
  const serviceLock=await begin(business), serviceSafety=await register(serviceLock.snapshot,business,"safety",serviceLock.token);
  await restore(serviceLock.token,backup,serviceSafety,original); await finish(serviceLock.token);
  assert.equal(await scalar("select stock_quantity from public.products where id=$1",[product]),3650);
  await db.exec("reset role");
  const expired=await begin(business);
  await rows("update public.backup_operation set expires_at=now()-interval '1 minute' where id");
  await rows("update public.products set stock_quantity=1900 where id=$1",[product]);
  await assert.rejects(restore(expired.token,backup,safety,original),/RESTORE_LOCK_EXPIRED/);
  await finish(expired.token);
  console.log("Backup SQL checks passed: tenant/global restores, safety rollback, weighted stock, credits/payments, historic rates, plans, write lease, invalid input rollback, audit preservation and owner isolation.");
} finally { await db.close(); }
