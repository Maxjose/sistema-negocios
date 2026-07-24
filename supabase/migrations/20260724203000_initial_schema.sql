begin;

create extension if not exists pgcrypto;

create type public.user_role as enum ('super_admin', 'owner');
create type public.record_status as enum ('active', 'inactive');
create type public.sale_status as enum ('completed', 'voided');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  logo_path text,
  currency_code text not null default 'USD'
    check (currency_code ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Caracas',
  contact_email text,
  contact_phone text,
  address text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  role public.user_role not null default 'owner',
  status public.record_status not null default 'active',
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_business_by_role check (
    (role = 'super_admin' and business_id is null)
    or (role = 'owner' and business_id is not null)
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_business_name_unique
  on public.categories (business_id, lower(trim(name)));

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 80),
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payment_methods_business_name_unique
  on public.payment_methods (business_id, lower(trim(name)));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 160),
  sku text,
  description text,
  image_path text,
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14, 2) not null check (sale_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 0
    check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_business_sku_unique
  on public.products (business_id, lower(trim(sku)))
  where sku is not null and trim(sku) <> '';

create index products_business_category_idx
  on public.products (business_id, category_id);
create index products_business_active_idx
  on public.products (business_id, is_active);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  sale_number bigint not null check (sale_number > 0),
  sold_at timestamptz not null default now(),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  total numeric(14, 2) not null check (total >= 0),
  total_cost numeric(14, 2) not null check (total_cost >= 0),
  gross_profit numeric(14, 2) not null,
  payment_method_id uuid references public.payment_methods(id) on delete restrict,
  payment_method_name text not null,
  status public.sale_status not null default 'completed',
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  voided_by uuid references public.profiles(id) on delete restrict,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sale_number),
  constraint valid_sale_totals check (
    discount <= subtotal and total = subtotal - discount
  ),
  constraint valid_void_data check (
    (status = 'completed' and voided_by is null and voided_at is null and void_reason is null)
    or
    (
      status = 'voided'
      and voided_by is not null
      and voided_at is not null
      and char_length(trim(void_reason)) >= 3
    )
  )
);

create index sales_business_sold_at_idx
  on public.sales (business_id, sold_at desc);
create index sales_business_status_idx
  on public.sales (business_id, status);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_sku text,
  category_name text,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  gross_profit numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_business_created_idx
  on public.audit_logs (business_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger payment_methods_set_updated_at
before update on public.payment_methods
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.business_id
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'active';
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.role = 'super_admin' and p.status = 'active'
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.current_business_id() from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.current_business_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.audit_logs enable row level security;

create policy businesses_admin_all on public.businesses
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy businesses_owner_select on public.businesses
for select to authenticated
using (id = public.current_business_id());

create policy profiles_admin_all on public.profiles
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy profiles_self_select on public.profiles
for select to authenticated
using (id = auth.uid() and status = 'active');

create policy categories_tenant_select on public.categories
for select to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy categories_tenant_insert on public.categories
for insert to authenticated
with check (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy categories_tenant_update on public.categories
for update to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
)
with check (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy categories_tenant_delete on public.categories
for delete to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy payment_methods_tenant_select on public.payment_methods
for select to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy payment_methods_tenant_insert on public.payment_methods
for insert to authenticated
with check (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy payment_methods_tenant_update on public.payment_methods
for update to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
)
with check (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy payment_methods_tenant_delete on public.payment_methods
for delete to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy products_tenant_select on public.products
for select to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy products_tenant_insert on public.products
for insert to authenticated
with check (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy products_tenant_update on public.products
for update to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
)
with check (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy products_tenant_delete on public.products
for delete to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy sales_tenant_select on public.sales
for select to authenticated
using (
  public.is_super_admin()
  or business_id = public.current_business_id()
);

create policy sale_items_tenant_select on public.sale_items
for select to authenticated
using (
  exists (
    select 1
    from public.sales s
    where s.id = sale_items.sale_id
      and (
        public.is_super_admin()
        or s.business_id = public.current_business_id()
      )
  )
);

create policy audit_logs_admin_select on public.audit_logs
for select to authenticated
using (public.is_super_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy business_assets_select on storage.objects
for select to authenticated
using (
  bucket_id = 'business-assets'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_business_id()::text
  )
);

create policy business_assets_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'business-assets'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_business_id()::text
  )
);

create policy business_assets_update on storage.objects
for update to authenticated
using (
  bucket_id = 'business-assets'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_business_id()::text
  )
)
with check (
  bucket_id = 'business-assets'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_business_id()::text
  )
);

create policy business_assets_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'business-assets'
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = public.current_business_id()::text
  )
);

commit;
