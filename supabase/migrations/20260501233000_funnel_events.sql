create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  prospect_id uuid references public.prospects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  source text,
  status_from text,
  status_to text,
  channel text,
  amount numeric,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.funnel_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'funnel_events'
      and policyname = 'Team members can use funnel events'
  ) then
    create policy "Team members can use funnel events"
      on public.funnel_events
      for all
      using (public.is_team_member(auth.uid()))
      with check (public.is_team_member(auth.uid()));
  end if;
end $$;

create index if not exists funnel_events_created_at_idx on public.funnel_events(created_at desc);
create index if not exists funnel_events_event_type_idx on public.funnel_events(event_type);
create index if not exists funnel_events_prospect_id_idx on public.funnel_events(prospect_id);
create index if not exists funnel_events_client_id_idx on public.funnel_events(client_id);
create index if not exists funnel_events_source_idx on public.funnel_events(source);
