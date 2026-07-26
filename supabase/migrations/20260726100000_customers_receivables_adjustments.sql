begin;

alter table public.businesses
  add column enable_customers boolean not null default false,
  add column enable_credits boolean not null default false,
  add column enable_stock_adjustments boolean not null default false;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_business_id_idx on public.customers(business_id);

alter table public.sales
  add column customer_id uuid references public.customers(id) on delete set null,
  add column customer_name text;

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete set null,
  description text not null check (char_length(trim(description)) between 2 and 250),
  original_amount numeric(14,2) not null check (original_amount > 0),
  balance numeric(14,2) not null check (balance >= 0),
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (balance <= original_amount)
);
create index receivables_business_status_idx on public.receivables(business_id, status, due_date);
create index receivables_customer_id_idx on public.receivables(customer_id);

create table public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  receivable_id uuid not null references public.receivables(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  payment_method_name text not null,
  note text,
  created_by uuid not null references public.profiles(id),
  paid_at timestamptz not null default now()
);
create index receivable_payments_receivable_idx on public.receivable_payments(receivable_id, paid_at);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  previous_quantity integer not null,
  new_quantity integer not null check (new_quantity >= 0),
  difference integer not null,
  reason text not null check (char_length(trim(reason)) between 3 and 250),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index inventory_adjustments_product_idx on public.inventory_adjustments(product_id, created_at desc);

alter table public.customers enable row level security;
alter table public.receivables enable row level security;
alter table public.receivable_payments enable row level security;
alter table public.inventory_adjustments enable row level security;

create policy customers_tenant_all on public.customers for all to authenticated
using (public.is_super_admin() or business_id = public.current_business_id())
with check (public.is_super_admin() or business_id = public.current_business_id());
create policy receivables_tenant_select on public.receivables for select to authenticated
using (public.is_super_admin() or business_id = public.current_business_id());
create policy receivables_tenant_insert on public.receivables for insert to authenticated
with check (public.is_super_admin() or business_id = public.current_business_id());
create policy receivable_payments_tenant_select on public.receivable_payments for select to authenticated
using (public.is_super_admin() or business_id = public.current_business_id());
create policy inventory_adjustments_tenant_select on public.inventory_adjustments for select to authenticated
using (public.is_super_admin() or business_id = public.current_business_id());

create or replace function public.record_receivable_payment(
  p_receivable_id uuid, p_amount numeric, p_payment_method_id uuid, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_receivable public.receivables%rowtype;
  v_method public.payment_methods;
  v_payment_id uuid;
begin
  select p.* into v_profile from public.profiles p join public.businesses b on b.id = p.business_id
  where p.id = auth.uid() and p.role = 'owner' and p.status = 'active'
    and b.status = 'active' and b.enable_credits;
  if v_profile.id is null then raise exception 'CREDITS_DISABLED'; end if;
  select * into v_receivable from public.receivables where id = p_receivable_id and business_id = v_profile.business_id for update;
  if v_receivable.id is null or v_receivable.status <> 'open' then raise exception 'RECEIVABLE_NOT_OPEN'; end if;
  if p_amount <= 0 or p_amount > v_receivable.balance then raise exception 'INVALID_PAYMENT_AMOUNT'; end if;
  select * into v_method from public.payment_methods where id = p_payment_method_id and business_id = v_profile.business_id and is_active;
  if v_method.id is null then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  insert into public.receivable_payments (business_id, receivable_id, amount, payment_method_id, payment_method_name, note, created_by)
  values (v_profile.business_id, v_receivable.id, p_amount, v_method.id, v_method.name, nullif(trim(p_note), ''), v_profile.id)
  returning id into v_payment_id;
  update public.receivables set balance = balance - p_amount,
    status = case when balance - p_amount = 0 then 'paid' else 'open' end,
    updated_at = now() where id = v_receivable.id;
  insert into public.audit_logs (business_id, actor_user_id, action, entity_type, entity_id, after_data)
  values (v_profile.business_id, v_profile.id, 'receivable.payment_recorded', 'receivable', v_receivable.id::text,
    jsonb_build_object('amount', p_amount, 'payment_id', v_payment_id));
  return v_payment_id;
end; $$;

create or replace function public.adjust_product_stock(
  p_product_id uuid, p_new_quantity integer, p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_product public.products%rowtype;
  v_adjustment_id uuid;
begin
  select p.* into v_profile from public.profiles p join public.businesses b on b.id = p.business_id
  where p.id = auth.uid() and p.role = 'owner' and p.status = 'active'
    and b.status = 'active' and b.use_stock and b.enable_stock_adjustments;
  if v_profile.id is null then raise exception 'STOCK_ADJUSTMENTS_DISABLED'; end if;
  if p_new_quantity < 0 or char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'INVALID_ADJUSTMENT'; end if;
  select * into v_product from public.products where id = p_product_id and business_id = v_profile.business_id for update;
  if v_product.id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  insert into public.inventory_adjustments (business_id, product_id, previous_quantity, new_quantity, difference, reason, created_by)
  values (v_profile.business_id, v_product.id, v_product.stock_quantity, p_new_quantity,
    p_new_quantity - v_product.stock_quantity, trim(p_reason), v_profile.id)
  returning id into v_adjustment_id;
  update public.products set stock_quantity = p_new_quantity where id = v_product.id;
  insert into public.audit_logs (business_id, actor_user_id, action, entity_type, entity_id, after_data)
  values (v_profile.business_id, v_profile.id, 'product.stock_adjusted', 'product', v_product.id::text,
    jsonb_build_object('previous', v_product.stock_quantity, 'new', p_new_quantity, 'reason', trim(p_reason)));
  return v_adjustment_id;
end; $$;

revoke all on function public.record_receivable_payment(uuid, numeric, uuid, text) from public;
revoke all on function public.adjust_product_stock(uuid, integer, text) from public;
grant execute on function public.record_receivable_payment(uuid, numeric, uuid, text) to authenticated;
grant execute on function public.adjust_product_stock(uuid, integer, text) to authenticated;

commit;
