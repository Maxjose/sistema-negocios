begin;

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

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid
      and business_id = v_business.id and is_active for update;
    if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
    if v_business.use_stock and v_product.stock_quantity < v_quantity then raise exception 'INSUFFICIENT_STOCK:%', v_product.name; end if;
    v_subtotal := v_subtotal + (v_product.sale_price * v_quantity);
    v_total_cost := v_total_cost + (v_product.cost_price * v_quantity);
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
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
    select c.name into v_category_name from public.categories c where c.id = v_product.category_id;
    insert into public.sale_items (sale_id, product_id, product_name, product_sku, category_name, quantity,
      unit_cost, unit_price, subtotal, gross_profit)
    values (v_sale_id, v_product.id, v_product.name, v_product.sku, v_category_name, v_quantity,
      v_product.cost_price, v_product.sale_price, v_product.sale_price * v_quantity,
      (v_product.sale_price - v_product.cost_price) * v_quantity);
    if v_business.use_stock then update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id; end if;
  end loop;
  insert into public.receivables (business_id, customer_id, sale_id, description, original_amount, balance, due_date, created_by)
  values (v_business.id, v_customer.id, v_sale_id, 'Venta #' || v_sale_number, v_total, v_total, p_due_date, v_user_id);
  insert into public.audit_logs (business_id, actor_user_id, action, entity_type, entity_id, after_data)
  values (v_business.id, v_user_id, 'sale.credit_created', 'sale', v_sale_id::text,
    jsonb_build_object('sale_number', v_sale_number, 'total', v_total, 'customer_id', v_customer.id, 'due_date', p_due_date));
  return v_sale_id;
end; $$;

create or replace function public.cancel_voided_sale_receivable() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'completed' and new.status = 'voided' then
    update public.receivables set status = 'cancelled', balance = 0, updated_at = now()
    where sale_id = new.id and status = 'open';
  end if;
  return new;
end; $$;
create trigger cancel_receivable_after_sale_void
after update of status on public.sales for each row execute function public.cancel_voided_sale_receivable();

revoke all on function public.confirm_credit_sale(jsonb, uuid, date, numeric, text) from public;
grant execute on function public.confirm_credit_sale(jsonb, uuid, date, numeric, text) to authenticated;

commit;
