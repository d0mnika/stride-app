CREATE TABLE blocked_days (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  blocked_date date not null,
  created_at   timestamptz default now(),
  UNIQUE(user_id, blocked_date)
);
ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own blocked days"
  ON blocked_days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
