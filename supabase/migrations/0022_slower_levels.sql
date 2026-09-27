-- Levels were far too cheap (one easy run by level went from 1 to 7). The curve in src/lib/xp.ts is
-- now xpForLevel(l) = 500 + 150l, so totalXpForLevel(l) = 75l² + 425l; mirror it here.
create or replace function public._rank_index(points bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare lvl int := floor((-425 + sqrt(180625 + 300 * greatest(points, 0)::numeric)) / 150);
begin
  while 75 * (lvl + 1)::bigint * (lvl + 1) + 425 * (lvl + 1) <= points loop lvl := lvl + 1; end loop;
  while lvl > 0 and 75 * lvl::bigint * lvl + 425 * lvl > points loop lvl := lvl - 1; end loop;
  return (select count(*) - 1 from unnest(array[0, 11, 21, 31, 46, 61, 76, 91, 106, 121, 136, 151]) f where f <= lvl);
end $$;

-- fromOldCurve in src/lib/xp.ts: points earned under the old curve (6l² + 44l) moved onto the new
-- one at the same level and the same share of the way to the next, so nobody loses a level or rank.
create function public._from_old_curve(points bigint) returns bigint
language plpgsql immutable set search_path = '' as $$
declare lvl bigint := 0;
begin
  while 6 * (lvl + 1) * (lvl + 1) + 44 * (lvl + 1) <= points loop lvl := lvl + 1; end loop;
  return 75 * lvl * lvl + 425 * lvl
    + floor((points - (6 * lvl * lvl + 44 * lvl))::numeric / (50 + 12 * lvl) * (500 + 150 * lvl));
end $$;

revoke execute on function public._from_old_curve(bigint) from public, anon, authenticated;

update public.player_stats set xp = public._from_old_curve(xp), rp = public._from_old_curve(rp);
