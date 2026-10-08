begin;

-- Existing rows retain unit quantities. For weight rows quantities are grams,
-- and cost_price/sale_price (including sale snapshots) are per kilogram.
alter table public.products add column sale_unit text not null default 'unit'
  check (sale_unit in ('unit', 'weight'));
alter table public.sale_items add column sale_unit text not null default 'unit'
  check (sale_unit in ('unit', 'weight'));

-- Changing the measure would invalidate old stock and future cancellation.
create or replace function public.preserve_product_sale_unit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sale_unit is distinct from old.sale_unit then raise exception 'SALE_UNIT_IMMUTABLE'; end if;
  return new;
end;
$$;
revoke all on function public.preserve_product_sale_unit() from public;
create trigger products_preserve_sale_unit before update of sale_unit on public.products
for each row execute function public.preserve_product_sale_unit();

create or replace function public.confirm_sale(
  p_items jsonb,
  p_payment_method_id uuid,
  p_discount numeric default 0,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_payment_name text;
  v_sale_id uuid;
  v_sale_number bigint;
  v_subtotal numeric(14,2) := 0;
  v_total_cost numeric(14,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_category_name text;
begin
  select b.* into v_business
  from public.profiles p
  join public.businesses b on b.id = p.business_id
  where p.id = v_user_id and p.role = 'owner'
    and p.status = 'active' and b.status = 'active';
  if v_business.id is null then raise exception 'UNAUTHORIZED'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_SALE'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'TOO_MANY_ITEMS'; end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  if not v_business.allow_discounts and coalesce(p_discount, 0) > 0 then raise exception 'DISCOUNTS_DISABLED'; end if;
  if not v_business.allow_sale_notes and char_length(trim(coalesce(p_note, ''))) > 0 then raise exception 'SALE_NOTES_DISABLED'; end if;

  select pm.name into v_payment_name from public.payment_methods pm
  where pm.id = p_payment_method_id and pm.business_id = v_business.id and pm.is_active;
  if v_payment_name is null then raise exception 'INVALID_PAYMENT_METHOD'; end if;

  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by product_id having count(*) > 1
  ) then raise exception 'DUPLICATE_PRODUCT'; end if;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id'
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid
      and business_id = v_business.id and is_active for update;
    if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
    if v_item ? 'sale_unit' and v_item->>'sale_unit' is distinct from v_product.sale_unit then raise exception 'SALE_UNIT_CHANGED'; end if;
    if v_business.use_stock and v_product.stock_quantity < v_quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.name;
    end if;
    v_subtotal := v_subtotal + round(v_product.sale_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2);
    v_total_cost := v_total_cost + round(v_product.cost_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2);
  end loop;

  if p_discount > v_subtotal then raise exception 'DISCOUNT_EXCEEDS_SUBTOTAL'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_business.id::text, 0));
  select coalesce(max(s.sale_number), 0) + 1 into v_sale_number
  from public.sales s where s.business_id = v_business.id;

  insert into public.sales (
    business_id, sale_number, subtotal, discount, total, total_cost,
    gross_profit, payment_method_id, payment_method_name, note, created_by,
    stock_applied
  ) values (
    v_business.id, v_sale_number, v_subtotal, p_discount,
    v_subtotal - p_discount, v_total_cost,
    v_subtotal - p_discount - v_total_cost,
    p_payment_method_id, v_payment_name,
    case when v_business.allow_sale_notes then nullif(trim(p_note), '') else null end,
    v_user_id, v_business.use_stock
  ) returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id'
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid for update;
    select c.name into v_category_name from public.categories c
      where c.id = v_product.category_id;
    insert into public.sale_items (
      sale_id, product_id, product_name, product_sku, category_name,
      quantity, sale_unit, unit_cost, unit_price, subtotal, gross_profit
    ) values (
      v_sale_id, v_product.id, v_product.name, v_product.sku, v_category_name,
      v_quantity, v_product.sale_unit, v_product.cost_price, v_product.sale_price,
      round(v_product.sale_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2),
      round(v_product.sale_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2) - round(v_product.cost_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2)
    );
    if v_business.use_stock then
      update public.products set stock_quantity = stock_quantity - v_quantity
      where id = v_product.id;
    end if;
  end loop;

  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    v_business.id, v_user_id, 'sale.created', 'sale', v_sale_id::text,
    jsonb_build_object('sale_number', v_sale_number, 'total', v_subtotal - p_discount)
  );
  return v_sale_id;
end;
$$;


create or replace function public.confirm_credit_sale(
  p_items jsonb, p_customer_id uuid, p_due_date date,
  p_discount numeric default 0, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_customer public.customers%rowtype;
  v_sale_id uuid; v_sale_number bigint;
  v_subtotal numeric(14,2) := 0; v_total_cost numeric(14,2) := 0;
  v_item jsonb; v_product public.products%rowtype;
  v_quantity integer; v_category_name text; v_total numeric(14,2);
begin
  select b.* into v_business from public.profiles p join public.businesses b on b.id = p.business_id
  where p.id = v_user_id and p.role = 'owner' and p.status = 'active' and b.status = 'active';
  if v_business.id is null then raise exception 'UNAUTHORIZED'; end if;
  if not v_business.enable_customers or not v_business.enable_credits then raise exception 'CREDITS_DISABLED'; end if;
  select * into v_customer from public.customers where id = p_customer_id and business_id = v_business.id and is_active;
  if v_customer.id is null then raise exception 'INVALID_CUSTOMER'; end if;
  if p_due_date is null or p_due_date < current_date then raise exception 'INVALID_DUE_DATE'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_SALE'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'TOO_MANY_ITEMS'; end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  if not v_business.allow_discounts and coalesce(p_discount, 0) > 0 then raise exception 'DISCOUNTS_DISABLED'; end if;
  if not v_business.allow_sale_notes and char_length(trim(coalesce(p_note, ''))) > 0 then raise exception 'SALE_NOTES_DISABLED'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer) group by product_id having count(*) > 1)
    then raise exception 'DUPLICATE_PRODUCT'; end if;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid
      and business_id = v_business.id and is_active for update;
    if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
    if v_item ? 'sale_unit' and v_item->>'sale_unit' is distinct from v_product.sale_unit then raise exception 'SALE_UNIT_CHANGED'; end if;
    if v_business.use_stock and v_product.stock_quantity < v_quantity then raise exception 'INSUFFICIENT_STOCK:%', v_product.name; end if;
    v_subtotal := v_subtotal + round(v_product.sale_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2);
    v_total_cost := v_total_cost + round(v_product.cost_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2);
  end loop;
  if p_discount > v_subtotal then raise exception 'DISCOUNT_EXCEEDS_SUBTOTAL'; end if;
  v_total := v_subtotal - p_discount;
  if v_total <= 0 then raise exception 'INVALID_CREDIT_TOTAL'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_business.id::text, 0));
  select coalesce(max(s.sale_number), 0) + 1 into v_sale_number from public.sales s where s.business_id = v_business.id;
  insert into public.sales (business_id, sale_number, subtotal, discount, total, total_cost, gross_profit,
    payment_method_id, payment_method_name, note, created_by, stock_applied, customer_id, customer_name)
  values (v_business.id, v_sale_number, v_subtotal, p_discount, v_total, v_total_cost, v_total - v_total_cost,
    null, 'Crédito', case when v_business.allow_sale_notes then nullif(trim(p_note), '') else null end,
    v_user_id, v_business.use_stock, v_customer.id, v_customer.name) returning id into v_sale_id;
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
    select c.name into v_category_name from public.categories c where c.id = v_product.category_id;
    insert into public.sale_items (sale_id, product_id, product_name, product_sku, category_name, quantity, sale_unit,
      unit_cost, unit_price, subtotal, gross_profit)
    values (v_sale_id, v_product.id, v_product.name, v_product.sku, v_category_name, v_quantity, v_product.sale_unit,
      v_product.cost_price, v_product.sale_price, round(v_product.sale_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2),
      round(v_product.sale_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2) - round(v_product.cost_price * v_quantity / case when v_product.sale_unit = 'weight' then 1000 else 1 end, 2));
    if v_business.use_stock then update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id; end if;
  end loop;
  insert into public.receivables (business_id, customer_id, sale_id, description, original_amount, balance, due_date, created_by)
  values (v_business.id, v_customer.id, v_sale_id, 'Venta #' || v_sale_number, v_total, v_total, p_due_date, v_user_id);
  insert into public.audit_logs (business_id, actor_user_id, action, entity_type, entity_id, after_data)
  values (v_business.id, v_user_id, 'sale.credit_created', 'sale', v_sale_id::text,
    jsonb_build_object('sale_number', v_sale_number, 'total', v_total, 'customer_id', v_customer.id, 'due_date', p_due_date));
  return v_sale_id;
end; $$;


create or replace function public.business_report(
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_timezone text;
  v_currency text;
  v_from timestamptz;
  v_until timestamptz;
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then
    raise exception 'INVALID_REPORT_PERIOD';
  end if;

  select p.business_id, b.timezone, b.currency_code
    into v_business_id, v_timezone, v_currency
  from public.profiles p
  join public.businesses b on b.id = p.business_id
  where p.id = auth.uid()
    and p.role = 'owner'
    and p.status = 'active'
    and b.status = 'active';
  if v_business_id is null then raise exception 'UNAUTHORIZED'; end if;

  v_from := p_from::timestamp at time zone v_timezone;
  v_until := (p_to + 1)::timestamp at time zone v_timezone;

  select jsonb_build_object(
    'currency', v_currency,
    'timezone', v_timezone,
    'from', p_from,
    'to', p_to,
    'summary', jsonb_build_object(
      'total_sales', coalesce(sum(s.total), 0),
      'total_cost', coalesce(sum(s.total_cost), 0),
      'gross_profit', coalesce(sum(s.gross_profit), 0),
      'sale_count', count(s.id),
      'average_ticket', case when count(s.id) = 0 then 0 else coalesce(sum(s.total), 0) / count(s.id) end,
      'weight_sold_kg', coalesce((select sum(si.quantity) / 1000.0 from public.sale_items si join public.sales sx on sx.id = si.sale_id where si.sale_unit = 'weight' and sx.business_id = v_business_id and sx.status = 'completed' and sx.sold_at >= v_from and sx.sold_at < v_until), 0),
      'units_sold', coalesce((select sum(si.quantity) from public.sale_items si join public.sales sx on sx.id = si.sale_id where sx.business_id = v_business_id and si.sale_unit = 'unit' and sx.status = 'completed' and sx.sold_at >= v_from and sx.sold_at < v_until), 0)
    )
  ) into v_result
  from public.sales s
  where s.business_id = v_business_id
    and s.status = 'completed'
    and s.sold_at >= v_from and s.sold_at < v_until;

  v_result := v_result || jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.sale_date, 'sales', d.sales, 'profit', d.profit) order by d.sale_date)
      from (
        select timezone(v_timezone, s.sold_at)::date sale_date, sum(s.total) sales, sum(s.gross_profit) profit
        from public.sales s
        where s.business_id = v_business_id and s.status = 'completed'
          and s.sold_at >= v_from and s.sold_at < v_until
        group by 1
      ) d
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object('product_name', x.product_name, 'units', x.units, 'sale_unit', x.sale_unit, 'revenue', x.revenue, 'profit', x.profit) order by x.revenue desc, x.product_name)
      from (
        select si.product_id, si.product_name, si.sale_unit, sum(si.quantity) / case when si.sale_unit = 'weight' then 1000.0 else 1 end units, sum(si.subtotal) revenue, sum(si.gross_profit) profit
        from public.sale_items si join public.sales s on s.id = si.sale_id
        where s.business_id = v_business_id and s.status = 'completed'
          and s.sold_at >= v_from and s.sold_at < v_until
        group by si.product_id, si.product_name, si.sale_unit order by revenue desc, si.product_name limit 10
      ) x
    ), '[]'::jsonb),
    'payment_methods', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.payment_method_name, 'total', x.total, 'count', x.count) order by x.total desc)
      from (
        select s.payment_method_name, sum(s.total) total, count(*) count
        from public.sales s
        where s.business_id = v_business_id and s.status = 'completed'
          and s.sold_at >= v_from and s.sold_at < v_until
        group by s.payment_method_name
      ) x
    ), '[]'::jsonb),
    'inventory', (
      select jsonb_build_object(
        'product_count', count(*),
        'out_of_stock', count(*) filter (where p.stock_quantity = 0 and p.is_active),
        'low_stock', count(*) filter (where p.stock_quantity > 0 and p.stock_quantity <= p.low_stock_threshold and p.is_active),
        'cost_value', coalesce(sum(p.stock_quantity * p.cost_price / case when p.sale_unit = 'weight' then 1000 else 1 end) filter (where p.is_active), 0)
      )
      from public.products p where p.business_id = v_business_id
    )
  );
  return v_result;
end;
$$;


revoke all on function public.confirm_sale(jsonb, uuid, numeric, text) from public;
revoke all on function public.confirm_credit_sale(jsonb, uuid, date, numeric, text) from public;
revoke all on function public.business_report(date, date) from public;
grant execute on function public.confirm_sale(jsonb, uuid, numeric, text) to authenticated;
grant execute on function public.confirm_credit_sale(jsonb, uuid, date, numeric, text) to authenticated;
grant execute on function public.business_report(date, date) to authenticated;

commit;

