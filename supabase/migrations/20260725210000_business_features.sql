begin;

alter table public.businesses
  add column use_stock boolean not null default true,
  add column allow_discounts boolean not null default true,
  add column allow_sale_notes boolean not null default true;

alter table public.sales
  add column stock_applied boolean not null default true;

create or replace function public.record_password_change()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles
  where id = auth.uid() and role = 'owner' and status = 'active';
  if v_profile.id is null then raise exception 'UNAUTHORIZED'; end if;

  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id
  ) values (
    v_profile.business_id, v_profile.id, 'auth.password_changed',
    'profile', v_profile.id::text
  );
end;
$$;

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

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid
      and business_id = v_business.id and is_active for update;
    if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
    if v_business.use_stock and v_product.stock_quantity < v_quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.name;
    end if;
    v_subtotal := v_subtotal + (v_product.sale_price * v_quantity);
    v_total_cost := v_total_cost + (v_product.cost_price * v_quantity);
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

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid for update;
    select c.name into v_category_name from public.categories c
      where c.id = v_product.category_id;
    insert into public.sale_items (
      sale_id, product_id, product_name, product_sku, category_name,
      quantity, unit_cost, unit_price, subtotal, gross_profit
    ) values (
      v_sale_id, v_product.id, v_product.name, v_product.sku, v_category_name,
      v_quantity, v_product.cost_price, v_product.sale_price,
      v_product.sale_price * v_quantity,
      (v_product.sale_price - v_product.cost_price) * v_quantity
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

create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_sale public.sales%rowtype;
  v_item public.sale_items%rowtype;
begin
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'VOID_REASON_REQUIRED'; end if;
  select b.* into v_business from public.profiles p
  join public.businesses b on b.id = p.business_id
  where p.id = v_user_id and p.role = 'owner'
    and p.status = 'active' and b.status = 'active';
  if v_business.id is null then raise exception 'UNAUTHORIZED'; end if;
  select * into v_sale from public.sales
  where id = p_sale_id and business_id = v_business.id for update;
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
  if v_sale.status <> 'completed' then raise exception 'SALE_ALREADY_VOIDED'; end if;

  if v_sale.stock_applied then
    for v_item in select * from public.sale_items where sale_id = p_sale_id
    loop
      update public.products set stock_quantity = stock_quantity + v_item.quantity
      where id = v_item.product_id;
    end loop;
  end if;
  update public.sales set status = 'voided', voided_by = v_user_id,
    voided_at = now(), void_reason = trim(p_reason) where id = p_sale_id;
  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    v_business.id, v_user_id, 'sale.voided', 'sale', p_sale_id::text,
    jsonb_build_object('reason', trim(p_reason))
  );
end;
$$;

revoke all on function public.record_password_change() from public;
revoke all on function public.confirm_sale(jsonb, uuid, numeric, text) from public;
revoke all on function public.void_sale(uuid, text) from public;
grant execute on function public.record_password_change() to authenticated;
grant execute on function public.confirm_sale(jsonb, uuid, numeric, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;

commit;
