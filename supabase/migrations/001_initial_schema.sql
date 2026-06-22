-- GridAudit database schema
-- Run this in your Supabase SQL editor or via CLI

-- ── PROFILES ─────────────────────────────────────────────────
-- Extends Supabase auth.users with org info
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  org_name text,
  tier text not null default 'free', -- free | pro | enterprise
  audits_used integer not null default 0,
  audits_limit integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, org_name)
  values (
    new.id,
    new.raw_user_meta_data->>'org_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── AUDITS ────────────────────────────────────────────────────
create table public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  org_name text not null,
  facility_type text not null,
  state text not null,
  utility_type text not null,
  -- Parsed bill data
  utility_provider text,
  account_number text,
  billing_period text,
  total_bill_amount numeric,
  -- Audit results
  annual_savings_estimate numeric,
  current_rate_schedule text,
  recommended_rate_schedule text,
  findings jsonb,           -- array of finding objects
  bill_summary jsonb,       -- energy/demand/taxes/other breakdown
  recommendations jsonb,    -- array of strings
  -- File reference (stored in Supabase Storage)
  file_path text,
  file_name text,
  -- Meta
  status text not null default 'complete', -- processing | complete | error
  created_at timestamptz not null default now()
);

alter table public.audits enable row level security;

create policy "Users can view own audits"
  on public.audits for select
  using (auth.uid() = user_id);

create policy "Users can insert own audits"
  on public.audits for insert
  with check (auth.uid() = user_id);

-- Index for dashboard queries
create index audits_user_id_created_at on public.audits(user_id, created_at desc);


-- ── STORAGE BUCKET ────────────────────────────────────────────
-- Create a private bucket for uploaded bills
insert into storage.buckets (id, name, public)
values ('bills', 'bills', false);

create policy "Users can upload own bills"
  on storage.objects for insert
  with check (
    bucket_id = 'bills' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own bills"
  on storage.objects for select
  using (
    bucket_id = 'bills' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
