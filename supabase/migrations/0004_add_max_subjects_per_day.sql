alter table profiles
  add column if not exists max_subjects_per_day integer default null;
