-- ── MIGRATION 002: Rate Schedule Database ────────────────────
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- ── STATES ───────────────────────────────────────────────────
create table public.states (
  id serial primary key,
  code char(2) not null unique,  -- 'NY', 'CA', etc.
  name text not null,
  puc_name text,                 -- "Public Service Commission", "PUC", etc.
  puc_url text,                  -- Base URL of state PUC website
  created_at timestamptz not null default now()
);

-- ── COUNTIES ─────────────────────────────────────────────────
create table public.counties (
  id serial primary key,
  state_code char(2) not null references public.states(code),
  name text not null,
  created_at timestamptz not null default now(),
  unique(state_code, name)
);

create index counties_state_code on public.counties(state_code);

-- ── UTILITIES ─────────────────────────────────────────────────
create table public.utilities (
  id serial primary key,
  state_code char(2) not null references public.states(code),
  name text not null,
  type text not null,            -- electric | gas | water | oil | multi
  puc_filing_url text,           -- Direct URL to their rate filing page
  rate_page_url text,            -- URL where current rates are published
  last_verified_at timestamptz,  -- When rates were last confirmed accurate
  verification_status text default 'pending', -- current | stale | flagged | pending
  created_at timestamptz not null default now()
);

create index utilities_state_code on public.utilities(state_code);

-- ── UTILITY COUNTIES (which utilities serve which counties) ───
create table public.utility_counties (
  utility_id integer not null references public.utilities(id) on delete cascade,
  county_id integer not null references public.counties(id) on delete cascade,
  primary key (utility_id, county_id)
);

create index utility_counties_county_id on public.utility_counties(county_id);

-- ── RATE SCHEDULES ────────────────────────────────────────────
-- One row per rate schedule (e.g. "SC-2 General Service Medium")
create table public.rate_schedules (
  id serial primary key,
  utility_id integer not null references public.utilities(id) on delete cascade,
  schedule_code text not null,        -- 'SC-2', 'GS-3', 'TOU-GS', etc.
  schedule_name text not null,        -- 'General Service Medium Voltage'
  customer_classes text[] not null,   -- ['commercial', 'snf', 'multifamily', etc.]
  utility_types text[] not null,      -- ['electric'] or ['gas'] etc.
  -- Energy charges
  energy_rate_per_kwh numeric,        -- $/kWh (electric)
  energy_rate_per_therm numeric,      -- $/therm (gas)
  energy_rate_per_ccf numeric,        -- $/CCF (water/gas)
  -- Demand charges
  demand_rate_per_kw numeric,         -- $/kW of peak demand
  demand_ratchet_pct numeric,         -- e.g. 85 = 85% ratchet clause
  demand_ratchet_months integer,      -- lookback window in months
  -- Fixed charges
  customer_charge_monthly numeric,    -- Fixed monthly customer charge
  -- Taxes and fees
  sales_tax_rate numeric,             -- State/local sales tax %
  sales_tax_exempt_classes text[],    -- Facility types exempt from sales tax
  gross_receipts_tax_rate numeric,
  -- Fuel adjustment
  fuel_adjustment_method text,        -- 'fixed' | 'variable' | 'none'
  fuel_adjustment_rate numeric,       -- Current fuel adjustment $/kWh or %
  -- Time of use (if applicable)
  has_tou boolean default false,
  tou_peak_rate numeric,
  tou_offpeak_rate numeric,
  tou_peak_hours text,               -- e.g. "8am-8pm weekdays"
  -- Metadata
  effective_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(utility_id, schedule_code)
);

create index rate_schedules_utility_id on public.rate_schedules(utility_id);

-- ── FACILITY EXEMPTIONS ───────────────────────────────────────
-- State-level exemptions by facility type (e.g. healthcare exempt from sales tax)
create table public.facility_exemptions (
  id serial primary key,
  state_code char(2) not null references public.states(code),
  facility_type text not null,       -- 'snf', 'assisted', 'manufacturing', etc.
  utility_type text not null,        -- 'electric', 'gas', 'water', 'oil'
  exemption_type text not null,      -- 'sales_tax', 'gross_receipts', 'franchise_fee'
  exemption_pct numeric not null,    -- 100 = fully exempt, 50 = 50% exempt
  requires_certificate boolean default true,
  certificate_form text,             -- Form name/number to file
  notes text,
  effective_date date,
  created_at timestamptz not null default now(),
  unique(state_code, facility_type, utility_type, exemption_type)
);

create index facility_exemptions_state on public.facility_exemptions(state_code);

-- ── RATE VERIFICATION LOG ─────────────────────────────────────
-- Tracks every automated rate check
create table public.rate_verifications (
  id serial primary key,
  utility_id integer not null references public.utilities(id) on delete cascade,
  checked_at timestamptz not null default now(),
  status text not null,              -- 'current' | 'updated' | 'flagged' | 'error'
  changes_detected jsonb,            -- What changed, if anything
  claude_confidence text,            -- 'high' | 'medium' | 'low'
  raw_scraped_content text,          -- What Claude saw on the rate page
  notes text,
  reviewed_by text,                  -- Admin email if manually reviewed
  reviewed_at timestamptz
);

create index rate_verifications_utility_id on public.rate_verifications(utility_id, checked_at desc);

-- ── RLS POLICIES ──────────────────────────────────────────────
-- Rate data is public-readable (anyone can look up rates)
alter table public.states enable row level security;
alter table public.counties enable row level security;
alter table public.utilities enable row level security;
alter table public.utility_counties enable row level security;
alter table public.rate_schedules enable row level security;
alter table public.facility_exemptions enable row level security;
alter table public.rate_verifications enable row level security;

-- Public read access for rate lookup
create policy "Public can read states" on public.states for select using (true);
create policy "Public can read counties" on public.counties for select using (true);
create policy "Public can read utilities" on public.utilities for select using (true);
create policy "Public can read utility_counties" on public.utility_counties for select using (true);
create policy "Public can read rate_schedules" on public.rate_schedules for select using (true);
create policy "Public can read facility_exemptions" on public.facility_exemptions for select using (true);

-- Only service role (server) can write rate data
create policy "Service role can manage states" on public.states for all using (auth.role() = 'service_role');
create policy "Service role can manage counties" on public.counties for all using (auth.role() = 'service_role');
create policy "Service role can manage utilities" on public.utilities for all using (auth.role() = 'service_role');
create policy "Service role can manage utility_counties" on public.utility_counties for all using (auth.role() = 'service_role');
create policy "Service role can manage rate_schedules" on public.rate_schedules for all using (auth.role() = 'service_role');
create policy "Service role can manage facility_exemptions" on public.facility_exemptions for all using (auth.role() = 'service_role');
create policy "Service role can manage rate_verifications" on public.rate_verifications for all using (auth.role() = 'service_role');

-- Auto-update updated_at on rate_schedules
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rate_schedules_updated_at
  before update on public.rate_schedules
  for each row execute procedure update_updated_at();
