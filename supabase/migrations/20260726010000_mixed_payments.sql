begin;
create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  payment_method_name text not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index sale_payments_sale_id_idx on public.sale_payments(sale_id);
alter table public.sale_payments enable row level security;
create policy sale_payments_tenant_select on public.sale_payments for select using (
  exists (
    select 1
    from public.sales s
    where s.id = sale_id
      and (
        public.is_super_admin()
        or s.business_id = public.current_business_id()
      )
  )
);
create or replace function public.confirm_sale_v2(
  p_items jsonb, p_payments jsonb, p_discount numeric default 0, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid; v_sale_id uuid; v_sale_total numeric(14,2);
  v_payment_total numeric(14,2); v_first_method uuid;
begin
  select business_id into v_business_id from public.profiles
  where id = auth.uid() and role = 'owner' and status = 'active';
  if v_business_id is null then raise exception 'UNAUTHORIZED'; end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then raise exception 'PAYMENT_REQUIRED'; end if;
  if jsonb_array_length(p_payments) > 5 then raise exception 'TOO_MANY_PAYMENTS'; end if;
  if exists (select 1 from jsonb_to_recordset(p_payments) as x(payment_method_id uuid, amount numeric) where amount <= 0)
    then raise exception 'INVALID_PAYMENT_AMOUNT'; end if;
  if exists (select 1 from jsonb_to_recordset(p_payments) as x(payment_method_id uuid, amount numeric)
    group by payment_method_id having count(*) > 1) then raise exception 'DUPLICATE_PAYMENT_METHOD'; end if;
  if exists (select 1 from jsonb_to_recordset(p_payments) as x(payment_method_id uuid, amount numeric)
    left join public.payment_methods pm on pm.id = x.payment_method_id and pm.business_id = v_business_id and pm.is_active
    where pm.id is null) then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  select payment_method_id into v_first_method from jsonb_to_recordset(p_payments) as x(payment_method_id uuid, amount numeric) limit 1;
  v_sale_id := public.confirm_sale(p_items, v_first_method, p_discount, p_note);
  select total into v_sale_total from public.sales where id = v_sale_id;
  select round(sum(amount), 2) into v_payment_total from jsonb_to_recordset(p_payments) as x(payment_method_id uuid, amount numeric);
  if v_payment_total <> v_sale_total then raise exception 'PAYMENT_TOTAL_MISMATCH'; end if;
  insert into public.sale_payments (sale_id, payment_method_id, payment_method_name, amount)
    select v_sale_id, pm.id, pm.name, x.amount
    from jsonb_to_recordset(p_payments) as x(payment_method_id uuid, amount numeric)
    join public.payment_methods pm on pm.id = x.payment_method_id;
  update public.sales set payment_method_name = case when jsonb_array_length(p_payments) > 1 then 'Pago mixto'
    else (select payment_method_name from public.sale_payments where sale_id = v_sale_id limit 1) end
    where id = v_sale_id;
  return v_sale_id;
end; $$;
revoke all on function public.confirm_sale_v2(jsonb, jsonb, numeric, text) from public;
grant execute on function public.confirm_sale_v2(jsonb, jsonb, numeric, text) to authenticated;
commit;
