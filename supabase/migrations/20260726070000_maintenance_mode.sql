begin;

create table public.platform_settings (
  id boolean primary key default true check (id),
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.platform_settings (id) values (true);
alter table public.platform_settings enable row level security;

create policy platform_settings_admin_select on public.platform_settings
for select to authenticated using (public.is_super_admin());

create or replace function public.is_maintenance_mode()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select maintenance_mode from public.platform_settings where id = true), false); $$;

revoke all on function public.is_maintenance_mode() from public;
grant execute on function public.is_maintenance_mode() to anon, authenticated;

commit;
