-- What each study day held, for the orbit calendar's intensity and day details. Days recorded
-- before this migration keep 0/0 and are drawn at the lowest intensity.
alter table public.study_days
  add column phrases int not null default 0 check (phrases >= 0),
  add column xp      int not null default 0 check (xp >= 0);
