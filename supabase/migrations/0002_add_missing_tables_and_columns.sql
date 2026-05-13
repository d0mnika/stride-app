-- ============================================================
-- Stride — Migration 0002: Add missing tables and profile columns
-- ============================================================

-- Add missing columns to profiles
alter table profiles
  add column if not exists daily_study_minutes   integer default 120,
  add column if not exists session_length_minutes integer default 50,
  add column if not exists break_length_minutes   integer default 10,
  add column if not exists buffer_minutes         integer default 15,
  add column if not exists plan                   text    default 'free' check (plan in ('free', 'pro'));

-- Recurring weekly events (e.g. "every Monday 09:00–10:00 I have a lecture")
create table if not exists recurring_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  title       text,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz default now()
);

alter table recurring_events enable row level security;

create policy "recurring_events: own rows" on recurring_events
  for all using (auth.uid() = user_id);

-- AI-generated material summaries
create table if not exists material_summaries (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid references study_materials(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  source_text text not null,
  summary     text not null,
  model_used  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (material_id)
);

alter table material_summaries enable row level security;

create policy "material_summaries: own rows" on material_summaries
  for all using (auth.uid() = user_id);

-- Study blocks (calendar time slots for studying, placed by the scheduler)
create table if not exists study_blocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time   time not null,
  created_at timestamptz default now()
);

alter table study_blocks enable row level security;

create policy "study_blocks: own rows" on study_blocks
  for all using (auth.uid() = user_id);
