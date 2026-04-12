-- ============================================================
-- Stride — Initial Schema
-- ============================================================

-- Profiles (extends Supabase Auth users)
create table if not exists profiles (
  id          uuid references auth.users primary key,
  name        text,
  night_start time default '23:00',
  night_end   time default '07:00',
  created_at  timestamptz default now()
);

-- Exams
create table if not exists exams (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade,
  subject       text not null,
  exam_date     date not null,
  priority      integer default 1,
  revision_days integer default 1,
  created_at    timestamptz default now()
);

-- Study materials (books, slides, notes, etc.)
create table if not exists study_materials (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid references exams(id) on delete cascade,
  title       text not null,
  type        text check (type in ('book', 'slides', 'notes', 'other')),
  total_units integer not null,
  unit_label  text default 'page',
  created_at  timestamptz default now()
);

-- Study sessions (records of actual work done)
create table if not exists study_sessions (
  id              uuid primary key default gen_random_uuid(),
  material_id     uuid references study_materials(id) on delete cascade,
  user_id         uuid references profiles(id) on delete cascade,
  units_completed integer not null,
  time_spent_sec  integer not null,
  session_date    date not null,
  created_at      timestamptz default now()
);

-- Calendar events (blocks of time unavailable for studying)
create table if not exists calendar_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  title      text,
  start_time timestamptz not null,
  end_time   timestamptz not null,
  created_at timestamptz default now()
);

-- Schedules (generated study plan slots)
create table if not exists schedules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  material_id  uuid references study_materials(id) on delete cascade,
  slot_date    date not null,
  units_target integer not null,
  is_done      boolean default false,
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles       enable row level security;
alter table exams          enable row level security;
alter table study_materials enable row level security;
alter table study_sessions  enable row level security;
alter table calendar_events enable row level security;
alter table schedules       enable row level security;

-- Profiles: users can only see and edit their own profile
create policy "profiles: own row" on profiles
  for all using (auth.uid() = id);

-- Exams
create policy "exams: own rows" on exams
  for all using (auth.uid() = user_id);

-- Study materials (access via exam ownership)
create policy "study_materials: own rows" on study_materials
  for all using (
    exists (
      select 1 from exams
      where exams.id = study_materials.exam_id
        and exams.user_id = auth.uid()
    )
  );

-- Study sessions
create policy "study_sessions: own rows" on study_sessions
  for all using (auth.uid() = user_id);

-- Calendar events
create policy "calendar_events: own rows" on calendar_events
  for all using (auth.uid() = user_id);

-- Schedules
create policy "schedules: own rows" on schedules
  for all using (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on sign-up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
