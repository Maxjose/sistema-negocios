begin;

alter table public.businesses
  add column plan_tier text not null default 'free'
    check (plan_tier in ('free', 'basic', 'premium', 'unlimited')),
  add column plan_started_at timestamptz not null default now(),
  add column plan_expires_at timestamptz default (now() + interval '30 days');

update public.businesses
set plan_expires_at = case
  when plan_tier = 'unlimited' then null
  else coalesce(plan_expires_at, plan_started_at + interval '30 days')
end;

commit;
