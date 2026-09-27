-- The learner's IANA time zone (e.g. 'America/Sao_Paulo'), taken from the browser. Study days,
-- streaks and quests are keyed on this clock, so it's kept with the profile.

alter table public.profiles add column time_zone text check (char_length(time_zone) <= 64);
