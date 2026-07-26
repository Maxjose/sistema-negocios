begin;

alter table public.businesses
  add column accent_theme text not null default 'emerald'
  check (accent_theme in ('emerald', 'blue', 'violet', 'rose', 'amber', 'cyan'));

create or replace function public.set_business_accent(p_accent_theme text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if p_accent_theme not in ('emerald', 'blue', 'violet', 'rose', 'amber', 'cyan') then
    raise exception 'INVALID_ACCENT_THEME';
  end if;
  select * into v_profile from public.profiles
  where id = auth.uid() and role = 'owner' and status = 'active';
  if v_profile.id is null then raise exception 'UNAUTHORIZED'; end if;

  update public.businesses set accent_theme = p_accent_theme
  where id = v_profile.business_id and status = 'active';

  insert into public.audit_logs (
    business_id, actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    v_profile.business_id, v_profile.id, 'business.accent_changed',
    'business', v_profile.business_id::text,
    jsonb_build_object('accent_theme', p_accent_theme)
  );
end;
$$;

revoke all on function public.set_business_accent(text) from public;
grant execute on function public.set_business_accent(text) to authenticated;

commit;
