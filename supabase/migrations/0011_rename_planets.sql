-- Moon, Nebula and Galaxy aren't planets: renamed to fictional planets (Aurelia, Virelia, Zenith)
-- so every entry in "planets" is actually a planet. Order and CEFR bands are unchanged.
--
-- Constraints are dropped before the renaming updates and re-added after, otherwise each UPDATE
-- would be checked against the old (narrower) constraint and fail before it could be replaced.

alter table public.phrases drop constraint phrases_planet_check;

update public.phrases set planet = 'aurelia' where planet = 'moon';
update public.phrases set planet = 'virelia' where planet = 'nebula';
update public.phrases set planet = 'zenith'  where planet = 'galaxy';

alter table public.phrases add constraint phrases_planet_check
  check (planet in ('earth','aurelia','mars','venus','jupiter','saturn','uranus','neptune','virelia','zenith'));

alter table public.planet_stats drop constraint planet_stats_planet_check;

update public.planet_stats set planet = 'aurelia' where planet = 'moon';
update public.planet_stats set planet = 'virelia' where planet = 'nebula';
update public.planet_stats set planet = 'zenith'  where planet = 'galaxy';

alter table public.planet_stats add constraint planet_stats_planet_check
  check (planet in ('earth','aurelia','mars','venus','jupiter','saturn','uranus','neptune','virelia','zenith'));
