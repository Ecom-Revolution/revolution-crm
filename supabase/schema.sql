-- ================================================
-- Revolution CRM — Supabase Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ================================================
-- PROFILES (extends Supabase auth.users)
-- ================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'closer' check (role in ('admin', 'setter', 'closer')),
  avatar text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Profiles: chaque user voit tous les profils, modifie seulement le sien
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Trigger: créer le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'closer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================
-- LEADS
-- ================================================
create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  company text,
  sector text,
  email text,
  phone text,
  website text,
  source text default 'Google Maps',
  stage text default 'Prospect' check (stage in ('Prospect', 'Contacté', 'RDV Pris', 'Proposition Envoyée', 'Gagné', 'Perdu')),
  heat_score text default 'Cold' check (heat_score in ('Hot', 'Warm', 'Cold')),
  estimated_value numeric default 0,
  upsell_potential boolean default false,
  loss_reason text,
  assigned_closer_id uuid references public.profiles(id) on delete set null,
  last_contact_at timestamptz default now(),
  stage_updated_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.leads enable row level security;

create policy "Leads are viewable by admins and assigned members"
  on public.leads for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or assigned_closer_id = auth.uid()
  );

create policy "Authenticated users can insert leads"
  on public.leads for insert with check (auth.role() = 'authenticated');

create policy "Admins and assigned members can update leads"
  on public.leads for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or assigned_closer_id = auth.uid()
  );

create policy "Admins can delete leads"
  on public.leads for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on public.leads
  for each row execute procedure public.handle_updated_at();

-- Indexes
create index leads_stage_idx on public.leads(stage);
create index leads_closer_idx on public.leads(assigned_closer_id);
create index leads_created_at_idx on public.leads(created_at desc);

-- ================================================
-- ACTIVITIES
-- ================================================
create table public.activities (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('call', 'email', 'meeting', 'note')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.activities enable row level security;

create policy "Activities are viewable by authenticated users"
  on public.activities for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert activities"
  on public.activities for insert with check (auth.role() = 'authenticated');

create policy "Admins can delete activities"
  on public.activities for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index activities_lead_idx on public.activities(lead_id);
create index activities_created_at_idx on public.activities(created_at desc);

-- ================================================
-- CLIENTS
-- ================================================
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  company text,
  email text,
  phone text,
  website text,
  service text default 'Social Media',
  monthly_value numeric default 0,
  status text default 'Actif' check (status in ('Actif', 'En pause', 'Terminé')),
  start_date date,
  notes text,
  nps integer check (nps >= 0 and nps <= 10),
  upsell_potential boolean default false,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;

create policy "Clients are viewable by authenticated users"
  on public.clients for select using (auth.role() = 'authenticated');

create policy "Authenticated users can manage clients"
  on public.clients for all using (auth.role() = 'authenticated');

-- ================================================
-- TEMPLATES
-- ================================================
create table public.templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null check (type in ('Email', 'SMS', 'WhatsApp', 'Appel', 'LinkedIn')),
  subject text,
  body text not null,
  tags text[] default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.templates enable row level security;

create policy "Templates are viewable by authenticated users"
  on public.templates for select using (auth.role() = 'authenticated');

create policy "Authenticated users can manage templates"
  on public.templates for all using (auth.role() = 'authenticated');

-- ================================================
-- VIEWS utiles
-- ================================================

-- Vue leads avec closer joint
create or replace view public.leads_with_closer as
select
  l.*,
  p.name as closer_name,
  p.email as closer_email,
  p.avatar as closer_avatar
from public.leads l
left join public.profiles p on l.assigned_closer_id = p.id;

-- Stats par closer
create or replace view public.closer_stats as
select
  p.id,
  p.name,
  p.email,
  p.role,
  count(l.id) as total_leads,
  count(l.id) filter (where l.stage = 'Gagné') as won,
  count(l.id) filter (where l.stage = 'Perdu') as lost,
  count(l.id) filter (where l.stage not in ('Gagné', 'Perdu')) as active,
  coalesce(sum(l.estimated_value) filter (where l.stage = 'Gagné'), 0) as revenue,
  coalesce(sum(l.estimated_value) filter (where l.stage not in ('Gagné', 'Perdu')), 0) as pipeline_value
from public.profiles p
left join public.leads l on l.assigned_closer_id = p.id
group by p.id, p.name, p.email, p.role;

-- ================================================
-- SEED DATA (optionnel — supprimer en production)
-- ================================================
-- Créez d'abord un user admin via Supabase Auth Dashboard
-- puis mettez à jour son rôle:
-- update public.profiles set role = 'admin' where email = 'votre@email.com';
