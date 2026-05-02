create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  label text not null,
  kind text not null default 'ai',
  enabled boolean not null default false,
  api_key text null,
  base_url text null,
  model text null,
  notes text null,
  priority integer not null default 100,
  last_test_status text null,
  last_test_message text null,
  last_test_at timestamptz null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_integration_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_integration_settings_updated_at on public.integration_settings;
create trigger trg_integration_settings_updated_at
before update on public.integration_settings
for each row
execute function public.set_integration_settings_updated_at();

alter table public.integration_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_settings'
      and policyname = 'Team members can read integration settings'
  ) then
    create policy "Team members can read integration settings"
      on public.integration_settings
      for select
      using (public.is_team_member(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_settings'
      and policyname = 'Admins manage integration settings'
  ) then
    create policy "Admins manage integration settings"
      on public.integration_settings
      for all
      using (public.has_role(auth.uid(), 'admin'))
      with check (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

create index if not exists integration_settings_kind_idx on public.integration_settings(kind);
create index if not exists integration_settings_enabled_idx on public.integration_settings(enabled);
