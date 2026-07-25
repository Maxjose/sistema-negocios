begin;

create or replace function public.revoke_owner_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then raise exception 'UNAUTHORIZED'; end if;
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'owner'
  ) then raise exception 'OWNER_NOT_FOUND'; end if;

  delete from auth.sessions where user_id = p_user_id;

  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id
  )
  select business_id, auth.uid(), 'owner.sessions_revoked', 'profile', id::text
  from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.revoke_owner_sessions(uuid) from public;
grant execute on function public.revoke_owner_sessions(uuid) to authenticated;

commit;
