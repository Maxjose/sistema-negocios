begin;

create or replace function public.record_authenticated_login()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and status = 'active';

  if v_profile.id is null then raise exception 'UNAUTHORIZED'; end if;

  update public.profiles set last_login_at = now() where id = v_profile.id;
  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id
  ) values (
    v_profile.business_id, v_profile.id, 'auth.login', 'profile', v_profile.id::text
  );
end;
$$;

create or replace function public.complete_initial_password_change()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and status = 'active';

  if v_profile.id is null then raise exception 'UNAUTHORIZED'; end if;

  update public.profiles set must_change_password = false where id = v_profile.id;
  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    v_profile.business_id,
    v_profile.id,
    'auth.initial_password_changed',
    'profile',
    v_profile.id::text,
    jsonb_build_object('must_change_password', false)
  );
end;
$$;

revoke all on function public.record_authenticated_login() from public;
revoke all on function public.complete_initial_password_change() from public;
grant execute on function public.record_authenticated_login() to authenticated;
grant execute on function public.complete_initial_password_change() to authenticated;

commit;
