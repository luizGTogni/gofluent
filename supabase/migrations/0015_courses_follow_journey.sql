-- The journey is one main mission in solar-system order, so CEFR has to rise along it. Six courses
-- move to a new planet (content and topic travel together; each planet keeps its look):
--   aurelia (Greetings, A1)        -> venus
--   venus   (Relationships, A2)    -> jupiter
--   jupiter (Travel, B1)           -> saturn
--   saturn  (Work, B1)             -> uranus
--   uranus  (Slang, B2)            -> neptune
--   neptune (British accent, B2)   -> aurelia
-- Learners' planet stats move with their course. The moves form a cycle, so rows go through a
-- temporary 'moving:' name first (planet_stats is keyed by user and planet), and the planet check
-- constraints are dropped for the duration, as in 0011.

alter table public.phrases drop constraint phrases_planet_check;
alter table public.planet_stats drop constraint planet_stats_planet_check;

update public.phrases set planet = 'moving:' || case planet
  when 'aurelia' then 'venus'
  when 'venus'   then 'jupiter'
  when 'jupiter' then 'saturn'
  when 'saturn'  then 'uranus'
  when 'uranus'  then 'neptune'
  when 'neptune' then 'aurelia'
end
where planet in ('aurelia','venus','jupiter','saturn','uranus','neptune');
update public.phrases set planet = substr(planet, 8) where planet like 'moving:%';

update public.planet_stats set planet = 'moving:' || case planet
  when 'aurelia' then 'venus'
  when 'venus'   then 'jupiter'
  when 'jupiter' then 'saturn'
  when 'saturn'  then 'uranus'
  when 'uranus'  then 'neptune'
  when 'neptune' then 'aurelia'
end
where planet in ('aurelia','venus','jupiter','saturn','uranus','neptune');
update public.planet_stats set planet = substr(planet, 8) where planet like 'moving:%';

alter table public.phrases add constraint phrases_planet_check
  check (planet in ('earth','aurelia','mars','venus','jupiter','saturn','uranus','neptune','virelia','zenith'));
alter table public.planet_stats add constraint planet_stats_planet_check
  check (planet in ('earth','aurelia','mars','venus','jupiter','saturn','uranus','neptune','virelia','zenith'));
