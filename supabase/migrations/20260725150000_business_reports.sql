begin;

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
      'units_sold', coalesce((select sum(si.quantity) from public.sale_items si join public.sales sx on sx.id = si.sale_id where sx.business_id = v_business_id and sx.status = 'completed' and sx.sold_at >= v_from and sx.sold_at < v_until), 0)
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
      select jsonb_agg(jsonb_build_object('product_name', x.product_name, 'units', x.units, 'revenue', x.revenue, 'profit', x.profit) order by x.units desc)
      from (
        select si.product_name, sum(si.quantity) units, sum(si.subtotal) revenue, sum(si.gross_profit) profit
        from public.sale_items si join public.sales s on s.id = si.sale_id
        where s.business_id = v_business_id and s.status = 'completed'
          and s.sold_at >= v_from and s.sold_at < v_until
        group by si.product_name order by units desc limit 10
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
        'cost_value', coalesce(sum(p.stock_quantity * p.cost_price) filter (where p.is_active), 0)
      )
      from public.products p where p.business_id = v_business_id
    )
  );
  return v_result;
end;
$$;

revoke all on function public.business_report(date, date) from public;
grant execute on function public.business_report(date, date) to authenticated;

commit;
