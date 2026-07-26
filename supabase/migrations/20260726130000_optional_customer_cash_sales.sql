begin;

create or replace function public.confirm_sale_v3(
  p_items jsonb,
  p_payments jsonb,
  p_customer_id uuid default null,
  p_discount numeric default 0,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
  v_customer public.customers%rowtype;
  v_sale_id uuid;
begin
  select b.* into v_business
  from public.profiles p
  join public.businesses b on b.id = p.business_id
  where p.id = auth.uid() and p.role = 'owner'
    and p.status = 'active' and b.status = 'active';
  if v_business.id is null then raise exception 'UNAUTHORIZED'; end if;

  if p_customer_id is not null then
    if not v_business.enable_customers then raise exception 'CUSTOMERS_DISABLED'; end if;
    select * into v_customer from public.customers
    where id = p_customer_id and business_id = v_business.id and is_active;
    if v_customer.id is null then raise exception 'INVALID_CUSTOMER'; end if;
  end if;

  v_sale_id := public.confirm_sale_v2(p_items, p_payments, p_discount, p_note);
  if v_customer.id is not null then
    update public.sales
    set customer_id = v_customer.id, customer_name = v_customer.name
    where id = v_sale_id and business_id = v_business.id;
  end if;
  return v_sale_id;
end;
$$;

revoke all on function public.confirm_sale_v3(jsonb, jsonb, uuid, numeric, text) from public;
grant execute on function public.confirm_sale_v3(jsonb, jsonb, uuid, numeric, text) to authenticated;

commit;
