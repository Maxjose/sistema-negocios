begin;

create table public.business_backups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete restrict,
  scope text not null check (scope in ('business', 'platform')),
  kind text not null check (kind in ('manual', 'imported', 'safety')),
  status text not null default 'creating' check (status in ('creating', 'ready', 'failed')),
  label text not null check (length(label) between 1 and 160),
  storage_path text not null unique,
  size_bytes bigint check (size_bytes between 1 and 52428800),
  sha256 text check (sha256 ~ '^[a-f0-9]{64}$'),
  schema_fingerprint text,
  counts jsonb not null default '{}'::jsonb,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  restore_token uuid,
  error_message text,
  check ((scope = 'platform' and business_id is null) or (scope = 'business' and business_id is not null))
);
create index business_backups_scope_created_idx on public.business_backups(business_id, created_at desc);
create index business_backups_pending_idx on public.business_backups(created_at) where status = 'creating';
alter table public.business_backups enable row level security;
create policy business_backups_admin_select on public.business_backups for select to authenticated
using (public.is_super_admin());
revoke all on public.business_backups from public, anon, authenticated, service_role;
grant select on public.business_backups to authenticated;
grant select, insert, update on public.business_backups to service_role;

-- The durable lease also prevents writes from existing sessions and server-side jobs.
create table public.backup_operation (
  id boolean primary key default true check (id),
  token uuid,
  actor_id uuid,
  business_id uuid,
  started_at timestamptz,
  expires_at timestamptz
);
insert into public.backup_operation(id) values (true);
alter table public.backup_operation enable row level security;
revoke all on public.backup_operation from public, anon, authenticated, service_role;
grant select, update on public.backup_operation to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('platform-backups', 'platform-backups', false, 52428800, array['application/gzip'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit,
allowed_mime_types = excluded.allowed_mime_types;
-- Only the trusted server reads/writes this bucket. The browser receives scoped,
-- temporary signed upload/download URLs after super-admin authorization.

create or replace function public.backup_guard_writes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_lock public.backup_operation;
begin
  select * into v_lock from public.backup_operation where id for share;
  if v_lock.token is not null and v_lock.expires_at > clock_timestamp()
    and coalesce(current_setting('monii.restore_token', true), '') <> v_lock.token::text then
    raise exception 'RESTORE_IN_PROGRESS';
  end if;
  return null;
end; $$;
revoke all on function public.backup_guard_writes() from public, anon, authenticated;
do $$ declare v_table text; begin
  foreach v_table in array array['businesses','profiles','categories','payment_methods','customers','products',
    'business_currencies','sales','sale_items','sale_payments','sale_exchange_rates','receivables',
    'receivable_payments','inventory_adjustments','audit_logs','exchange_rates','platform_settings'] loop
    execute format('create trigger backup_guard_writes before insert or update or delete on public.%I for each statement execute function public.backup_guard_writes()', v_table);
  end loop;
end; $$;

create or replace function public.is_maintenance_mode() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select maintenance_mode from public.platform_settings where id), false)
    or exists (select 1 from public.backup_operation where token is not null and expires_at > now());
$$;

create or replace function public.backup_schema_fingerprint() returns text
language sql stable security invoker set search_path = '' as $$
  select md5(string_agg(c.table_name || '.' || c.column_name || ':' || c.udt_name,
    ',' order by c.table_name, c.ordinal_position))
  from information_schema.columns c where c.table_schema = 'public'
    and c.table_name = any(array['businesses','profiles','categories','payment_methods','customers','products',
      'business_currencies','sales','sale_items','sale_payments','sale_exchange_rates','receivables',
      'receivable_payments','inventory_adjustments','audit_logs','exchange_rates','platform_settings']);
$$;

create or replace function public.export_business_backup(p_actor uuid, p_business_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_table text; v_where text; v_rows jsonb; v_data jsonb := '{}'::jsonb; v_ids uuid[];
  v_decimal_fields text; v_projection text;
begin
  if not exists(select 1 from public.profiles where id = p_actor and role = 'super_admin' and status = 'active') then raise exception 'UNAUTHORIZED'; end if;
  if p_business_id is not null and not exists(select 1 from public.businesses where id = p_business_id) then raise exception 'BUSINESS_NOT_FOUND'; end if;
  select array_agg(id) into v_ids from public.businesses where p_business_id is null or id = p_business_id;
  foreach v_table in array array['businesses','profiles','categories','payment_methods','customers','products',
    'business_currencies','sales','sale_items','sale_payments','sale_exchange_rates','receivables',
    'receivable_payments','inventory_adjustments','audit_logs','exchange_rates','platform_settings'] loop
    v_where := case
      when v_table = 'businesses' then 'id = any($1)'
      when v_table = 'profiles' then 'business_id = any($1) or role = ''super_admin'''
      when v_table in ('sale_items','sale_payments','sale_exchange_rates') then 'sale_id in (select id from public.sales where business_id = any($1))'
      when v_table in ('exchange_rates','platform_settings') then case when p_business_id is null then 'true' else 'false' end
      when v_table = 'audit_logs' and p_business_id is null then 'true'
      else 'business_id = any($1)' end;
    -- JSON numbers are parsed as IEEE-754 doubles by JavaScript. Preserve exact
    -- NUMERIC and BIGINT values as decimal strings; populate_recordset casts them
    -- back without precision loss (including very large sale numbers).
    select string_agg(format('%L, r.%I::text', a.attname, a.attname), ',' order by a.attnum)
      into v_decimal_fields from pg_attribute a
      where a.attrelid = format('public.%I', v_table)::regclass and a.attnum > 0 and not a.attisdropped
        and a.atttypid in ('numeric'::regtype, 'int8'::regtype);
    v_projection := 'to_jsonb(r)' || coalesce(' || jsonb_build_object(' || v_decimal_fields || ')', '');
    execute format('select coalesce(jsonb_agg(%s order by r.id), ''[]''::jsonb) from (select * from public.%I where %s limit 100001) r', v_projection, v_table, v_where) into v_rows using v_ids;
    if jsonb_array_length(v_rows) > 100000 then raise exception 'BACKUP_TOO_LARGE'; end if;
    v_data := v_data || jsonb_build_object(v_table, v_rows);
  end loop;
  -- The server adds emails through the Auth Admin API. This SQL engine does not
  -- read or alter auth.users, password hashes, sessions or credentials.
  if octet_length(v_data::text) > 25165824 then raise exception 'BACKUP_TOO_LARGE'; end if;
  return jsonb_build_object('schema', public.backup_schema_fingerprint(), 'captured_at', now(), 'data', v_data);
end; $$;

create or replace function public.begin_backup_restore(p_actor uuid, p_business_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_token uuid := gen_random_uuid(); v_snapshot jsonb;
begin
  if not exists(select 1 from public.profiles where id = p_actor and role = 'super_admin' and status = 'active') then raise exception 'UNAUTHORIZED'; end if;
  update public.backup_operation set token = v_token, actor_id = p_actor, business_id = p_business_id,
    started_at = clock_timestamp(), expires_at = clock_timestamp() + interval '10 minutes'
  where id and (token is null or expires_at <= clock_timestamp());
  if not found then raise exception 'RESTORE_IN_PROGRESS'; end if;
  v_snapshot := public.export_business_backup(p_actor, p_business_id);
  return jsonb_build_object('token', v_token, 'snapshot', v_snapshot);
end; $$;

create or replace function public.finish_backup_restore(p_actor uuid, p_token uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.backup_operation set token = null, actor_id = null, business_id = null,
    started_at = null, expires_at = null where id and token = p_token and actor_id = p_actor;
end; $$;

create or replace function public.restore_business_backup(
  p_actor uuid, p_token uuid, p_backup_id uuid, p_safety_id uuid, p_snapshot jsonb
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_lock public.backup_operation; v_backup public.business_backups; v_table text;
  v_data jsonb := p_snapshot->'data'; v_ids uuid[]; v_columns text; v_updates text;
begin
  select * into v_lock from public.backup_operation where id for update;
  if v_lock.token is distinct from p_token or v_lock.actor_id is distinct from p_actor
    or v_lock.expires_at <= clock_timestamp() then raise exception 'RESTORE_LOCK_EXPIRED'; end if;
  if not exists(select 1 from public.profiles where id = p_actor and role = 'super_admin' and status = 'active') then raise exception 'UNAUTHORIZED'; end if;
  select * into v_backup from public.business_backups where id = p_backup_id and status = 'ready';
  if not found or v_backup.business_id is distinct from v_lock.business_id then raise exception 'INVALID_BACKUP_SCOPE'; end if;
  if not exists(select 1 from public.business_backups where id = p_safety_id and status = 'ready' and kind = 'safety'
    and restore_token = p_token and created_by = p_actor and business_id is not distinct from v_lock.business_id) then raise exception 'SAFETY_BACKUP_REQUIRED'; end if;
  if p_snapshot->>'schema' is distinct from public.backup_schema_fingerprint() then raise exception 'INCOMPATIBLE_BACKUP_SCHEMA'; end if;
  foreach v_table in array array['businesses','profiles','categories','payment_methods','customers','products',
    'business_currencies','sales','sale_items','sale_payments','sale_exchange_rates','receivables',
    'receivable_payments','inventory_adjustments','audit_logs','exchange_rates','platform_settings'] loop
    if jsonb_typeof(v_data->v_table) is distinct from 'array' or jsonb_array_length(v_data->v_table) > 100000 then raise exception 'INVALID_BACKUP_DATA'; end if;
  end loop;
  if v_lock.business_id is not null and (jsonb_array_length(v_data->'businesses') <> 1
    or v_data->'businesses'->0->>'id' is distinct from v_lock.business_id::text
    or jsonb_array_length(v_data->'exchange_rates') <> 0 or jsonb_array_length(v_data->'platform_settings') <> 0) then raise exception 'INVALID_BACKUP_SCOPE'; end if;
  select array_agg(id) into v_ids from jsonb_populate_recordset(null::public.businesses, v_data->'businesses');
  -- Protect the tenant boundary even when calling the engine outside the UI.
  foreach v_table in array array['categories','payment_methods','customers','products','business_currencies',
    'sales','receivables','receivable_payments','inventory_adjustments'] loop
    if exists(select 1 from jsonb_array_elements(v_data->v_table) x where x->>'business_id' is null
      or not ((x->>'business_id')::uuid = any(coalesce(v_ids, '{}'::uuid[])))) then raise exception 'CROSS_BUSINESS_BACKUP'; end if;
  end loop;
  if exists(select 1 from jsonb_populate_recordset(null::public.profiles, v_data->'profiles') p
    left join public.profiles current_profile on current_profile.id = p.id
    where current_profile.id is null or current_profile.role <> p.role
      or (p.role = 'owner' and (current_profile.business_id is distinct from p.business_id
        or not (p.business_id = any(coalesce(v_ids, '{}'::uuid[])))))) then raise exception 'BACKUP_USERS_CHANGED'; end if;
  if exists (
    select 1 from jsonb_populate_recordset(null::public.products, v_data->'products') p
    left join jsonb_populate_recordset(null::public.categories, v_data->'categories') c on c.id = p.category_id
    where p.category_id is not null and (c.id is null or c.business_id <> p.business_id)
    union all
    select 1 from jsonb_populate_recordset(null::public.sale_items, v_data->'sale_items') i
    left join jsonb_populate_recordset(null::public.sales, v_data->'sales') s on s.id = i.sale_id
    left join jsonb_populate_recordset(null::public.products, v_data->'products') p on p.id = i.product_id
    where s.id is null or p.id is null or s.business_id <> p.business_id
    union all
    select 1 from jsonb_populate_recordset(null::public.sales, v_data->'sales') s
    left join jsonb_populate_recordset(null::public.customers, v_data->'customers') c on c.id = s.customer_id
    left join jsonb_populate_recordset(null::public.payment_methods, v_data->'payment_methods') m on m.id = s.payment_method_id
    left join public.profiles p on p.id = s.created_by
    left join public.profiles vp on vp.id = s.voided_by
    where (s.customer_id is not null and (c.id is null or c.business_id <> s.business_id))
      or (s.payment_method_id is not null and (m.id is null or m.business_id <> s.business_id))
      or p.id is null or (p.role <> 'super_admin' and p.business_id <> s.business_id)
      or (s.voided_by is not null and (vp.id is null or (vp.role <> 'super_admin' and vp.business_id <> s.business_id)))
    union all
    select 1 from jsonb_populate_recordset(null::public.sale_payments, v_data->'sale_payments') sp
    left join jsonb_populate_recordset(null::public.sales, v_data->'sales') s on s.id = sp.sale_id
    left join jsonb_populate_recordset(null::public.payment_methods, v_data->'payment_methods') m on m.id = sp.payment_method_id
    where s.id is null or m.id is null or s.business_id <> m.business_id
    union all
    select 1 from jsonb_populate_recordset(null::public.sale_exchange_rates, v_data->'sale_exchange_rates') r
    left join jsonb_populate_recordset(null::public.sales, v_data->'sales') s on s.id = r.sale_id where s.id is null
    union all
    select 1 from jsonb_populate_recordset(null::public.receivables, v_data->'receivables') r
    left join jsonb_populate_recordset(null::public.customers, v_data->'customers') c on c.id = r.customer_id
    left join jsonb_populate_recordset(null::public.sales, v_data->'sales') s on s.id = r.sale_id
    left join public.profiles p on p.id = r.created_by
    where c.id is null or c.business_id <> r.business_id or (r.sale_id is not null and (s.id is null or s.business_id <> r.business_id))
      or p.id is null or (p.role <> 'super_admin' and p.business_id <> r.business_id)
    union all
    select 1 from jsonb_populate_recordset(null::public.receivable_payments, v_data->'receivable_payments') rp
    left join jsonb_populate_recordset(null::public.receivables, v_data->'receivables') r on r.id = rp.receivable_id
    left join jsonb_populate_recordset(null::public.payment_methods, v_data->'payment_methods') m on m.id = rp.payment_method_id
    left join public.profiles p on p.id = rp.created_by
    where r.id is null or m.id is null or r.business_id <> rp.business_id or m.business_id <> rp.business_id
      or p.id is null or (p.role <> 'super_admin' and p.business_id <> rp.business_id)
    union all
    select 1 from jsonb_populate_recordset(null::public.inventory_adjustments, v_data->'inventory_adjustments') i
    left join jsonb_populate_recordset(null::public.products, v_data->'products') p on p.id = i.product_id
    left join public.profiles actor on actor.id = i.created_by
    where p.id is null or p.business_id <> i.business_id or actor.id is null
      or (actor.role <> 'super_admin' and actor.business_id <> i.business_id)
  ) then raise exception 'INVALID_BACKUP_RELATIONS'; end if;
  -- Never permit IDs from the selected backup to overwrite another tenant's rows.
  foreach v_table in array array['categories','payment_methods','customers','products','business_currencies',
    'sales','receivables','receivable_payments','inventory_adjustments'] loop
    execute format('select exists(select 1 from public.%I current_row join jsonb_populate_recordset(null::public.%I, $1) incoming on incoming.id = current_row.id where current_row.business_id <> incoming.business_id)', v_table, v_table)
      into strict v_columns using v_data->v_table;
    if v_columns::boolean then raise exception 'CROSS_BUSINESS_BACKUP'; end if;
  end loop;
  perform set_config('monii.restore_token', p_token::text, true);
  -- Each delete and insert participates in this single transaction. Constraint
  -- failures roll everything back; no partial catalog, sales or balances remain.
  foreach v_table in array array['receivable_payments','receivables','inventory_adjustments','sale_payments',
    'sale_exchange_rates','sale_items','sales','products','categories','payment_methods','customers','business_currencies'] loop
    if v_table in ('sale_items','sale_payments','sale_exchange_rates') then
      execute format('delete from public.%I where sale_id in (select id from public.sales where $1 is null or business_id = $1)', v_table) using v_lock.business_id;
    else execute format('delete from public.%I where $1 is null or business_id = $1', v_table) using v_lock.business_id; end if;
  end loop;
  select string_agg(quote_ident(a.attname), ',' order by a.attnum),
    string_agg(format('%I = excluded.%I', a.attname, a.attname), ',' order by a.attnum) filter(where a.attname <> 'id')
    into v_columns, v_updates from pg_attribute a where a.attrelid = 'public.businesses'::regclass and a.attnum > 0 and not a.attisdropped;
  execute format('insert into public.businesses (%s) select %s from jsonb_populate_recordset(null::public.businesses, $1) on conflict(id) do update set %s', v_columns, v_columns, v_updates) using v_data->'businesses';
  -- Auth accounts and super administrators are deliberately not recreated or
  -- rolled back. Restore names/statuses only for already-associated owners.
  update public.profiles current_profile set full_name = incoming.full_name, status = incoming.status
  from jsonb_populate_recordset(null::public.profiles, v_data->'profiles') incoming
  where current_profile.id = incoming.id and current_profile.role = 'owner';
  update public.profiles set status = 'inactive' where role = 'owner'
    and (v_lock.business_id is null or business_id = v_lock.business_id)
    and id not in (select id from jsonb_populate_recordset(null::public.profiles, v_data->'profiles'));
  if v_lock.business_id is null then
    update public.businesses set status = 'inactive' where not (id = any(coalesce(v_ids, '{}'::uuid[])));
    delete from public.exchange_rates;
    insert into public.exchange_rates select * from jsonb_populate_recordset(null::public.exchange_rates, v_data->'exchange_rates');
    if jsonb_array_length(v_data->'platform_settings') <> 1 then raise exception 'INVALID_BACKUP_DATA'; end if;
    update public.platform_settings set maintenance_mode = (v_data->'platform_settings'->0->>'maintenance_mode')::boolean,
      updated_at = now(), updated_by = p_actor where id;
  end if;
  -- Remove default currency rows generated for previously absent businesses.
  delete from public.business_currencies where v_lock.business_id is null or business_id = v_lock.business_id;
  foreach v_table in array array['categories','payment_methods','customers','products','business_currencies',
    'sales','sale_items','sale_payments','receivables','receivable_payments','inventory_adjustments'] loop
    execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)', v_table, v_table) using v_data->v_table;
  end loop;
  -- Inserting sales runs the normal rate trigger; replace those rates with the
  -- original historic snapshots, never today's exchange rate.
  delete from public.sale_exchange_rates where sale_id in(select id from public.sales where v_lock.business_id is null or business_id = v_lock.business_id);
  insert into public.sale_exchange_rates select * from jsonb_populate_recordset(null::public.sale_exchange_rates, v_data->'sale_exchange_rates');
  -- Audit history is append-only: a restore must never erase its own evidence.
  insert into public.audit_logs(business_id, actor_user_id, action, entity_type, entity_id, after_data)
  values (v_lock.business_id, p_actor, 'backup.restored', 'backup', p_backup_id::text,
    jsonb_build_object('safety_backup_id', p_safety_id, 'original_captured_at', p_snapshot->>'captured_at'));
end; $$;

revoke all on function public.backup_schema_fingerprint() from public, anon, authenticated;
revoke all on function public.export_business_backup(uuid, uuid) from public, anon, authenticated;
revoke all on function public.begin_backup_restore(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_backup_restore(uuid, uuid) from public, anon, authenticated;
revoke all on function public.restore_business_backup(uuid, uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.backup_schema_fingerprint() to service_role;
grant execute on function public.export_business_backup(uuid, uuid) to service_role;
grant execute on function public.begin_backup_restore(uuid, uuid) to service_role;
grant execute on function public.finish_backup_restore(uuid, uuid) to service_role;
grant execute on function public.restore_business_backup(uuid, uuid, uuid, uuid, jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
