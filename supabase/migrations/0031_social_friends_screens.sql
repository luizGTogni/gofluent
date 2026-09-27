-- Social layer, part 3: the data the Friends, public profile and home-rail screens need that
-- parts 1/0021 and 2/0030 didn't return yet — a friend's level, this week's XP and whether they
-- studied today for the Friends list, and planets finished on both sides for the "you vs a friend"
-- comparison on their profile. Refactors get_public_profile's planet count into a shared helper so
-- friends_leaderboard can return the same number without repeating the query.

-- How many planets are finished (STOP_GOAL solid phrases, or all of them if a planet has fewer) —
-- the same rule get_public_profile (0030) used inline for 'planetsDone'.
create function public._planets_done(uid uuid) returns int
language sql stable set search_path = '' as $$
  select count(*) from (
    select s.solid >= least(10, n.total) as done
    from public.planet_stats s
    join lateral (select count(*) as total from public.phrases ph where ph.planet = s.planet) n on true
    where s.user_id = uid and n.total > 0
  ) t where done;
$$;

create or replace function public.get_public_profile(p_username text, p_local_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  target uuid;
  prof public.profiles;
  ps public.player_stats;
  inv public.inventory;
  full_detail boolean;
  last_day date;
  activity text;
  current_planet text;
  mutual int;
  bests jsonb;
  badges jsonb;
begin
  perform public._check_day(p_local_day, 7);
  select user_id into target from public.profiles where username = lower(p_username);
  if target is null or public._blocked(uid, target) then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  select * into prof from public.profiles where user_id = target;
  if prof.visibility = 'private' and uid <> target then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  full_detail := uid = target or prof.visibility = 'public' or public._are_friends(uid, target);
  if not full_detail then
    return public._player_card(target, uid) || jsonb_build_object('visibility', prof.visibility);
  end if;

  select * into ps from public.player_stats where user_id = target;
  select * into inv from public.inventory where user_id = target;

  if uid = target or prof.show_activity then
    last_day := (select max(day) from public.study_days where user_id = target and seconds > 0);
    activity := case
      when last_day is null then null
      when last_day = p_local_day then 'today'
      when last_day >= p_local_day - (extract(isodow from p_local_day)::int - 1) then 'this_week'
      else 'earlier'
    end;
  end if;

  -- The planet most recently played, done or not — good enough for "currently on".
  select planet into current_planet from public.planet_stats where user_id = target order by updated_at desc nulls last limit 1;

  select coalesce(jsonb_object_agg(mode, score), '{}'::jsonb) into bests
  from public.personal_bests where user_id = target;

  select coalesce(jsonb_agg(jsonb_build_object('id', achievement_id, 'unlockedAt', unlocked_at) order by unlocked_at), '[]'::jsonb)
    into badges
  from public.achievements where user_id = target;

  select count(*) into mutual
  from (
    select case when f.user_low = target then f.user_high else f.user_low end as other
    from public.friendships f where (f.user_low = target or f.user_high = target) and f.status = 'accepted'
  ) tf
  join (
    select case when f.user_low = uid then f.user_high else f.user_low end as other
    from public.friendships f where (f.user_low = uid or f.user_high = uid) and f.status = 'accepted'
  ) vf using (other);

  return jsonb_build_object(
    'username', prof.username,
    'fullName', case when uid = target or prof.show_full_name then prof.full_name else null end,
    'bio', prof.bio,
    'trail', inv.trail, 'halo', inv.halo,
    'rank', public._rank(public._effective_rp(target)),
    'level', public._xp_level(coalesce(ps.xp, 0)),
    'xp', coalesce(ps.xp, 0),
    'streak', case when uid = target or prof.show_activity then public._streak(target, p_local_day) else null end,
    'bestStreak', case when uid = target or prof.show_activity then public._best_streak(target) else null end,
    'cefr', (select max(substr(grant_key, 6)) from public.reward_grants where user_id = target and grant_key like 'cefr:%'),
    'currentPlanet', current_planet,
    'planetsDone', public._planets_done(target),
    'badges', badges,
    'personalBests', bests,
    'memberSince', prof.created_at,
    'lastActive', case when uid = target or prof.show_activity then activity else null end,
    'mutualFriends', mutual,
    'relation', public._relation(uid, target),
    'visibility', prof.visibility);
end $$;

create or replace function public.friends_leaderboard(p_period text, p_local_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  start_day date;
  prev_start date;
  prev_end date;
  result jsonb;
begin
  if p_period not in ('week', 'month', 'all') then raise exception 'bad period' using errcode = '22023'; end if;
  perform public._check_day(p_local_day, 7);

  if p_period = 'week' then
    start_day := p_local_day - (extract(isodow from p_local_day)::int - 1);
    prev_start := start_day - 7;
    prev_end := start_day - 1;
  elsif p_period = 'month' then
    start_day := date_trunc('month', p_local_day)::date;
    prev_start := (start_day - interval '1 month')::date;
    prev_end := start_day - 1;
  end if;

  with members as (
    select uid as user_id
    union
    select case when f.user_low = uid then f.user_high else f.user_low end
    from public.friendships f where (f.user_low = uid or f.user_high = uid) and f.status = 'accepted'
  ),
  cur_xp as (
    select m.user_id,
      case when p_period = 'all' then coalesce(ps.xp, 0)
           else coalesce((select sum(sd.xp) from public.study_days sd
                           where sd.user_id = m.user_id and sd.day between start_day and p_local_day), 0)
      end as xp
    from members m left join public.player_stats ps on ps.user_id = m.user_id
  ),
  prev_xp as (
    select m.user_id,
      coalesce((select sum(sd.xp) from public.study_days sd
                 where sd.user_id = m.user_id and sd.day between prev_start and prev_end), 0) as xp
    from members m
    where p_period <> 'all'
  ),
  cur_rank as (
    select user_id, xp, row_number() over (order by xp desc, user_id) as pos from cur_xp
  ),
  prev_rank as (
    select user_id, row_number() over (order by xp desc, user_id) as pos from prev_xp
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'username', p.username, 'trail', inv.trail, 'halo', inv.halo,
           'isSelf', c.user_id = uid,
           'position', c.pos,
           'delta', case when p_period = 'all' then null else pr.pos - c.pos end,
           'xp', c.xp,
           'level', public._xp_level(coalesce(ps.xp, 0)),
           'streak', public._streak(c.user_id, p_local_day),
           'planetsDone', public._planets_done(c.user_id),
           'activeToday', public._studied(c.user_id, p_local_day),
           'rank', public._rank(public._effective_rp(c.user_id)))
           order by c.pos), '[]'::jsonb)
    into result
  from cur_rank c
  join public.profiles p on p.user_id = c.user_id
  left join public.inventory inv on inv.user_id = c.user_id
  left join public.player_stats ps on ps.user_id = c.user_id
  left join prev_rank pr on pr.user_id = c.user_id;

  return jsonb_build_object('period', p_period, 'periodStart', start_day, 'players', result);
end $$;

-- list_friends now takes the viewer's local day, so "this week" and "today" match the same
-- cutoff every other social screen uses (src/lib/streak.ts's localDay, not the server's UTC).
drop function public.list_friends();

create function public.list_friends(p_local_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); result jsonb; start_day date;
begin
  perform public._check_day(p_local_day, 7);
  start_day := p_local_day - (extract(isodow from p_local_day)::int - 1);

  select coalesce(jsonb_agg(jsonb_build_object(
    'username', p.username, 'trail', inv.trail, 'halo', inv.halo,
    'rank', public._rank(public._effective_rp(f.other)),
    'level', public._xp_level(coalesce(ps.xp, 0)),
    'streak', public._streak(f.other, p_local_day),
    'xpWeek', coalesce((select sum(sd.xp) from public.study_days sd
                         where sd.user_id = f.other and sd.day between start_day and p_local_day), 0),
    'activeToday', public._studied(f.other, p_local_day),
    'since', f.accepted_at) order by p.username), '[]'::jsonb)
    into result
  from (
    select case when user_low = uid then user_high else user_low end as other, accepted_at
    from public.friendships where (user_low = uid or user_high = uid) and status = 'accepted'
  ) f
  join public.profiles p on p.user_id = f.other
  left join public.inventory inv on inv.user_id = f.other
  left join public.player_stats ps on ps.user_id = f.other;
  return result;
end $$;

revoke all on function public._planets_done(uuid) from public, anon, authenticated;
revoke all on function public.list_friends(date) from public, anon, authenticated;
grant execute on function public.list_friends(date) to authenticated;
