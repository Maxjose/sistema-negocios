begin;

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.business_id
  from public.profiles p
  join public.businesses b on b.id = p.business_id
  where p.id = auth.uid()
    and p.status = 'active'
    and b.status = 'active';
$$;

revoke all on function public.current_business_id() from public;
grant execute on function public.current_business_id() to authenticated;

commit;
