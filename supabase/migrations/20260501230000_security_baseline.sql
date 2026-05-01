-- Security baseline for Revolution CRM.
-- Run after the base schema has been created.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.is_team_member(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activity_log',
    'ai_activity_logs',
    'appointments',
    'call_scripts',
    'campaign_alerts',
    'campaigns',
    'clients',
    'funnel_events',
    'invoices',
    'outreach_messages',
    'outreach_sequences',
    'profiles',
    'prospects',
    'scraping_jobs',
    'scraping_results',
    'site_audits',
    'user_roles'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Admins manage roles') then
    create policy "Admins manage roles"
      on public.user_roles
      for all
      using (public.has_role(auth.uid(), 'admin'))
      with check (public.has_role(auth.uid(), 'admin'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Members read roles') then
    create policy "Members read roles"
      on public.user_roles
      for select
      using (public.is_team_member(auth.uid()));
  end if;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activity_log',
    'ai_activity_logs',
    'appointments',
    'call_scripts',
    'campaign_alerts',
    'campaigns',
    'clients',
    'funnel_events',
    'invoices',
    'outreach_messages',
    'outreach_sequences',
    'prospects',
    'scraping_jobs',
    'scraping_results',
    'site_audits'
  ]
  loop
    if to_regclass('public.' || table_name) is not null
      and not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = table_name
          and policyname = 'Team members can use CRM data'
      )
    then
      execute format(
        'create policy "Team members can use CRM data" on public.%I for all using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()))',
        table_name
      );
    end if;
  end loop;
end $$;

create index if not exists prospects_created_by_idx on public.prospects(created_by);
create index if not exists prospects_status_created_at_idx on public.prospects(status, created_at desc);
create index if not exists prospects_source_created_at_idx on public.prospects(source, created_at desc);
create index if not exists prospects_email_lower_idx on public.prospects(lower(email)) where email is not null;
create index if not exists prospects_phone_idx on public.prospects(phone) where phone is not null;
create index if not exists prospects_siren_idx on public.prospects(siren) where siren is not null;
create index if not exists scraping_jobs_created_by_idx on public.scraping_jobs(created_by);
create index if not exists scraping_results_job_id_idx on public.scraping_results(job_id);
