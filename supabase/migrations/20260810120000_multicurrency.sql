begin;

alter table public.businesses
  add column enable_multicurrency boolean not null default false;

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null default 'USD' check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$' and quote_currency <> base_currency),
  rate numeric(20, 8) check (rate > 0),
  source text not null,
  effective_date date,
  retrieved_at timestamptz,
  status text not null default 'missing' check (status in ('current', 'stale', 'error', 'missing')),
  error_message text,
  raw_reference jsonb,
  updated_at timestamptz not null default now(),
  unique (base_currency, quote_currency)
);

insert into public.exchange_rates (base_currency, quote_currency, source)
values ('USD', 'VES', 'BCV'), ('USD', 'COP', 'BANREP_TRM');

create table public.business_currencies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  is_enabled boolean not null default false,
  rate_mode text not null default 'automatic' check (rate_mode in ('automatic', 'manual')),
  manual_rate numeric(20, 8) check (manual_rate > 0),
  adjustment_percent numeric(8, 4) not null default 0 check (adjustment_percent between -50 and 100),
  rounding_increment numeric(14, 2) not null default 0.01 check (rounding_increment > 0),
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, currency_code)
);

insert into public.business_currencies (business_id, currency_code, display_order)
select id, 'VES', 0 from public.businesses
union all
select id, 'COP', 1 from public.businesses;

create or replace function public.create_default_business_currencies()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.business_currencies (business_id, currency_code, display_order)
  values (new.id, 'VES', 0), (new.id, 'COP', 1)
  on conflict (business_id, currency_code) do nothing;
  return new;
end;
$$;

create trigger create_business_currencies_after_business
after insert on public.businesses for each row
execute function public.create_default_business_currencies();

create table public.sale_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(20, 8) not null check (rate > 0),
  rounding_increment numeric(14, 2) not null default 0.01 check (rounding_increment > 0),
  source text not null,
  effective_date date,
  created_at timestamptz not null default now(),
  unique (sale_id, quote_currency)
);

create or replace function public.snapshot_sale_exchange_rates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sale_exchange_rates (
    sale_id, base_currency, quote_currency, rate, rounding_increment, source, effective_date
  )
  select
    new.id,
    b.currency_code,
    bc.currency_code,
    case
      when bc.rate_mode = 'manual' then bc.manual_rate
      else round(er.rate * (1 + bc.adjustment_percent / 100), 8)
    end,
    bc.rounding_increment,
    case
      when bc.rate_mode = 'manual' then 'MANUAL'
      else er.source
    end,
    case when bc.rate_mode = 'manual' then current_date else er.effective_date end
  from public.businesses b
  join public.business_currencies bc on bc.business_id = b.id and bc.is_enabled
  left join public.exchange_rates er
    on er.base_currency = b.currency_code
    and er.quote_currency = bc.currency_code
    and er.rate is not null
  where b.id = new.business_id
    and b.enable_multicurrency
    and b.currency_code = 'USD'
    and (
      (bc.rate_mode = 'manual' and bc.manual_rate is not null)
      or (bc.rate_mode = 'automatic' and er.rate is not null)
    );
  return new;
end;
$$;

create trigger snapshot_exchange_rates_after_sale
after insert on public.sales for each row
execute function public.snapshot_sale_exchange_rates();

create index business_currencies_business_id_idx on public.business_currencies(business_id);
create index sale_exchange_rates_sale_id_idx on public.sale_exchange_rates(sale_id);

alter table public.exchange_rates enable row level security;
alter table public.business_currencies enable row level security;
alter table public.sale_exchange_rates enable row level security;

create policy exchange_rates_authenticated_select
on public.exchange_rates for select to authenticated using (true);

create policy business_currencies_tenant_select
on public.business_currencies for select to authenticated
using (public.is_super_admin() or business_id = public.current_business_id());

create policy business_currencies_tenant_update
on public.business_currencies for update to authenticated
using (business_id = public.current_business_id())
with check (business_id = public.current_business_id());

create policy sale_exchange_rates_tenant_select
on public.sale_exchange_rates for select to authenticated
using (
  exists (
    select 1 from public.sales s
    where s.id = sale_id
      and (public.is_super_admin() or s.business_id = public.current_business_id())
  )
);

revoke all on public.exchange_rates from anon;
revoke all on public.business_currencies from anon;
revoke all on public.sale_exchange_rates from anon;
grant select on public.exchange_rates to authenticated;
grant select, update on public.business_currencies to authenticated;
grant select on public.sale_exchange_rates to authenticated;

commit;
