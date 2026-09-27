-- Social layer, part 2: friend requests, a friends leaderboard, player search and the public
-- profile read. Part 1 (0021) built the tables, the privacy columns and the block/friend helpers;
-- this migration adds the RPCs that act on them. Still nothing about one learner is readable by
-- another except through these security definer functions.

-- ---------------------------------------------------------------------------------------------
-- Rate limiting for outgoing friend requests: 5/minute, 30/day. Idempotent replies (already
-- friends, already pending in the same direction) don't count — only a call that actually creates
-- or accepts a request does.

create table public.friend_request_events (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index friend_request_events_user_time on public.friend_request_events (user_id, created_at);

alter table public.friend_request_events enable row level security;
-- No policies: written only by send_friend_request.

create function public._check_friend_request_rate(uid uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.friend_request_events
       where user_id = uid and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'too many friend requests, slow down' using errcode = '57014';
  end if;
  if (select count(*) from public.friend_request_events
       where user_id = uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'daily friend request limit reached' using errcode = '57014';
  end if;
  insert into public.friend_request_events (user_id) values (uid);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Helpers shared by the RPCs below (internal: not callable by clients)

-- none | pending_out | pending_in | friends | self, from `viewer`'s side.
create function public._relation(viewer uuid, target uuid) returns text
language sql stable set search_path = '' as $$
  select case
    when viewer = target then 'self'
    when public._are_friends(viewer, target) then 'friends'
    when exists (select 1 from public.friendships
                 where user_low = least(viewer, target) and user_high = greatest(viewer, target)
                   and status = 'pending' and requested_by = viewer) then 'pending_out'
    when exists (select 1 from public.friendships
                 where user_low = least(viewer, target) and user_high = greatest(viewer, target)
                   and status = 'pending' and requested_by = target) then 'pending_in'
    else 'none'
  end;
$$;

-- levelFromXp in src/lib/xp.ts, same curve public._level (0028) already mirrors.
create function public._xp_level(points bigint) returns int
language sql immutable set search_path = '' as $$
  select public._level(points);
$$;

-- How many levels a title spans, for the fading math below: TITLES in src/lib/titles.ts, boundary
-- levels [0, 11, 21, 31, 46, 61, 76, 91, 106, 121, 136, 151], the last one open-ended (span 75, the
-- same fallback effectiveRp uses in src/lib/ranks.ts).
create function public._title_span(lvl int) returns int
language sql immutable set search_path = '' as $$
  with bounds as (select array[0, 11, 21, 31, 46, 61, 76, 91, 106, 121, 136, 151] as f),
       idx as (select count(*)::int - 1 as i from bounds, unnest(f) x where x <= greatest(lvl, 0))
  select case when idx.i < 11 then (select f[idx.i + 2] - f[idx.i + 1] from bounds) else 75 end from idx;
$$;

-- rankOf(rp).index and its stars, from src/lib/ranks.ts: rankForLevel splits each title's levels
-- into thirds (the open-ended last title, into 25-level chunks instead).
create function public._rank(points bigint) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  lvl int := public._xp_level(greatest(points, 0));
  idx int := public._rank_index(points);
  t_from int := (array[0, 11, 21, 31, 46, 61, 76, 91, 106, 121, 136, 151])[idx + 1];
  span int := public._title_span(lvl);
  stars int;
begin
  if idx < 11 then
    stars := least(3, floor((lvl - t_from) * 3.0 / span)::int + 1);
  else
    stars := least(3, 1 + floor((lvl - t_from) / 25.0)::int);
  end if;
  return jsonb_build_object('index', idx, 'stars', stars);
end $$;

-- effectiveRp in src/lib/ranks.ts: after a 3-day grace, one star's worth of levels fades per
-- further week of inactivity, up to 3 stars, computed fresh every read (never persisted).
create function public._effective_rp(uid uuid) returns bigint
language plpgsql stable set search_path = '' as $$
declare
  ps record;
  idle_days int;
  lost int;
  lvl int;
begin
  select rp, last_active_at into ps from public.player_stats where user_id = uid;
  if ps.rp is null then return 0; end if;
  idle_days := case when ps.last_active_at is null then 0
                    else greatest(0, floor(extract(epoch from (now() - ps.last_active_at)) / 86400))::int end;
  lost := least(3, floor(greatest(0, idle_days - 3) / 7.0))::int;
  lvl := public._xp_level(ps.rp);
  for i in 1..lost loop
    exit when lvl <= 0;
    lvl := greatest(0, lvl - ceil(public._title_span(lvl) / 3.0)::int);
  end loop;
  return least(ps.rp, 75 * lvl::bigint * lvl + 425 * lvl);
end $$;

-- The longest run of covered days ever (studied, or bridged by a Streak Shield) — same computation
-- as the 'best_streak' achievement metric in migration 0028.
create function public._best_streak(uid uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce(max(len), 0) from (
    select count(*) as len from (
      select day, day - (row_number() over (order by day))::int as run from (
        select day from public.study_days where user_id = uid and seconds > 0
        union select day from public.freeze_days where user_id = uid) c) r
    group by run) runs;
$$;

-- A minimal public card: username, equipped cosmetics, rank and level. Used by search and by the
-- 'friends'-visibility profile a non-friend still gets a glimpse of.
create function public._player_card(uid uuid, viewer uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'username', p.username,
    'trail', inv.trail, 'halo', inv.halo,
    'rank', public._rank(public._effective_rp(p.user_id)),
    'level', public._xp_level(coalesce(ps.xp, 0)),
    'relation', public._relation(viewer, p.user_id))
  from public.profiles p
  left join public.player_stats ps on ps.user_id = p.user_id
  left join public.inventory inv on inv.user_id = p.user_id
  where p.user_id = uid;
$$;

-- ---------------------------------------------------------------------------------------------
-- RPCs: search and public profile

-- Prefix match on username (case-insensitive, 3+ characters) or an exact friend code. Excludes
-- blocks either way, the caller, and private profiles.
create function public.search_players(q text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  raw text := btrim(coalesce(q, ''));
  needle text := lower(raw);
  code text := upper(raw);
  result jsonb;
begin
  if char_length(needle) < 3 then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(public._player_card(p.user_id, uid) order by (p.friend_code = code) desc, p.username), '[]'::jsonb)
    into result
  from public.profiles p
  where p.user_id <> uid
    and p.visibility <> 'private'
    and not public._blocked(uid, p.user_id)
    and (p.friend_code = code or p.username like needle || '%')
  limit 20;
  return result;
end $$;

-- The full profile a friend (or anyone, if public) sees; a non-friend of a 'friends'-visibility
-- profile gets only the minimal card instead of nothing. `p_local_day` is the viewer's local day
-- (src/lib/streak.ts), used as the one common cutoff for the target's streak and "last active" label
-- — not the target's own time zone, so every viewer of a profile agrees on what "this week" means.
create function public.get_public_profile(p_username text, p_local_day date) returns jsonb
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
  planets_done int;
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

  select count(*) filter (where done), max(planet) filter (where entered_at = max_entered)
    into planets_done, current_planet
  from (
    select s.planet, s.entered_at,
           max(s.entered_at) over () as max_entered,
           n.total > 0 and s.solid >= least(10, n.total) as done
    from public.planet_stats s
    join lateral (select count(*) as total from public.phrases ph where ph.planet = s.planet) n on true
    where s.user_id = target
  ) t;

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
    'planetsDone', coalesce(planets_done, 0),
    'badges', badges,
    'personalBests', bests,
    'memberSince', prof.created_at,
    'lastActive', case when uid = target or prof.show_activity then activity else null end,
    'mutualFriends', mutual,
    'relation', public._relation(uid, target),
    'visibility', prof.visibility);
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPCs: friend requests, friends and blocks. Clients never see another learner's user_id (search
-- and the profile RPCs only ever return a username), so every one of these takes the other
-- player's username instead. Each sets an absolute state (a row exists or doesn't, in a given
-- status), so repeating a call is always harmless.

create function public._user_by_username(p_username text) returns uuid
language sql stable set search_path = '' as $$
  select user_id from public.profiles where username = lower(coalesce(p_username, ''));
$$;

create function public.send_friend_request(p_target text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  target uuid := public._user_by_username(p_target);
  lo uuid; hi uuid;
  existing public.friendships;
begin
  if target is null then raise exception 'player not found' using errcode = 'P0002'; end if;
  if target = uid then raise exception 'invalid target' using errcode = '22023'; end if;
  if public._blocked(uid, target) then raise exception 'blocked' using errcode = '42501'; end if;

  lo := least(uid, target);
  hi := greatest(uid, target);
  select * into existing from public.friendships where user_low = lo and user_high = hi;

  if existing.status = 'accepted' then
    return jsonb_build_object('relation', 'friends');
  elsif existing.status = 'pending' and existing.requested_by = uid then
    return jsonb_build_object('relation', 'pending_out');
  elsif existing.status = 'pending' and existing.requested_by = target then
    -- The other side already asked: this call accepts it instead of crossing a second request.
    perform public._check_friend_request_rate(uid);
    update public.friendships set status = 'accepted', accepted_at = now() where user_low = lo and user_high = hi;
    return jsonb_build_object('relation', 'friends');
  end if;

  if (select allow_requests from public.profiles where user_id = target) = 'nobody' then
    raise exception 'this player is not taking requests' using errcode = '42501';
  end if;

  perform public._check_friend_request_rate(uid);
  insert into public.friendships (user_low, user_high, requested_by) values (lo, hi, uid);
  return jsonb_build_object('relation', 'pending_out');
end $$;

create function public.cancel_friend_request(p_target text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); target uuid := public._user_by_username(p_target);
begin
  if target is not null then
    delete from public.friendships
     where user_low = least(uid, target) and user_high = greatest(uid, target)
       and status = 'pending' and requested_by = uid;
  end if;
  return jsonb_build_object('relation', 'none');
end $$;

create function public.accept_friend_request(p_from text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); other uuid := public._user_by_username(p_from);
begin
  if other is null then raise exception 'player not found' using errcode = 'P0002'; end if;
  update public.friendships set status = 'accepted', accepted_at = now()
   where user_low = least(uid, other) and user_high = greatest(uid, other)
     and status = 'pending' and requested_by = other;
  if not found and not public._are_friends(uid, other) then
    raise exception 'no pending request from that player' using errcode = 'P0002';
  end if;
  return jsonb_build_object('relation', 'friends');
end $$;

create function public.decline_friend_request(p_from text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); other uuid := public._user_by_username(p_from);
begin
  if other is not null then
    delete from public.friendships
     where user_low = least(uid, other) and user_high = greatest(uid, other)
       and status = 'pending' and requested_by = other;
  end if;
  return jsonb_build_object('relation', 'none');
end $$;

-- Removes the friendship without telling the other learner (there is no such notification anywhere
-- in this app: nothing needs to change for that to hold).
create function public.remove_friend(p_target text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); target uuid := public._user_by_username(p_target);
begin
  if target is not null then
    delete from public.friendships
     where user_low = least(uid, target) and user_high = greatest(uid, target) and status = 'accepted';
  end if;
  return jsonb_build_object('relation', 'none');
end $$;

create function public.block_user(p_target text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); target uuid := public._user_by_username(p_target);
begin
  if target is null then raise exception 'player not found' using errcode = 'P0002'; end if;
  if target = uid then raise exception 'invalid target' using errcode = '22023'; end if;
  delete from public.friendships where user_low = least(uid, target) and user_high = greatest(uid, target);
  insert into public.blocks (blocker, blocked) values (uid, target) on conflict do nothing;
  return jsonb_build_object('relation', 'blocked');
end $$;

create function public.unblock_user(p_target text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); target uuid := public._user_by_username(p_target);
begin
  if target is not null then
    delete from public.blocks where blocker = uid and blocked = target;
  end if;
  return jsonb_build_object('relation', 'none');
end $$;

create function public.list_friends() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); result jsonb; today date := (now() at time zone 'utc')::date;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'username', p.username, 'trail', inv.trail, 'halo', inv.halo,
    'rank', public._rank(public._effective_rp(f.other)),
    'streak', public._streak(f.other, today),
    'since', f.accepted_at) order by p.username), '[]'::jsonb)
    into result
  from (
    select case when user_low = uid then user_high else user_low end as other, accepted_at
    from public.friendships where (user_low = uid or user_high = uid) and status = 'accepted'
  ) f
  join public.profiles p on p.user_id = f.other
  left join public.inventory inv on inv.user_id = f.other;
  return result;
end $$;

create function public.list_requests() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); incoming jsonb; outgoing jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'username', p.username, 'trail', inv.trail, 'halo', inv.halo, 'requestedAt', f.created_at)
           order by f.created_at desc), '[]'::jsonb)
    into incoming
  from public.friendships f
  join public.profiles p on p.user_id = (case when f.user_low = uid then f.user_high else f.user_low end)
  left join public.inventory inv on inv.user_id = p.user_id
  where (f.user_low = uid or f.user_high = uid) and f.status = 'pending' and f.requested_by <> uid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'username', p.username, 'trail', inv.trail, 'halo', inv.halo, 'requestedAt', f.created_at)
           order by f.created_at desc), '[]'::jsonb)
    into outgoing
  from public.friendships f
  join public.profiles p on p.user_id = (case when f.user_low = uid then f.user_high else f.user_low end)
  left join public.inventory inv on inv.user_id = p.user_id
  where (f.user_low = uid or f.user_high = uid) and f.status = 'pending' and f.requested_by = uid;

  return jsonb_build_object('incoming', incoming, 'outgoing', outgoing);
end $$;

create function public.list_blocked() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public._require_uid(); result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'blockedAt', b.created_at) order by b.created_at desc), '[]'::jsonb)
    into result
  from public.blocks b join public.profiles p on p.user_id = b.blocked
  where b.blocker = uid;
  return result;
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPC: friends leaderboard. `p_local_day` is the viewer's local day; the week (Monday-based) and
-- month windows it implies are that one cutoff applied to every friend's study_days, documented
-- here as the single source of truth for "this week"/"this month" on this screen — not each
-- learner's own time zone, so the ordering the viewer sees is internally consistent. The previous
-- period's ranking (for the position delta) is computed the same way, over the same friend group,
-- rather than kept in a snapshot table.
create function public.friends_leaderboard(p_period text, p_local_day date) returns jsonb
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
           'streak', public._streak(c.user_id, p_local_day),
           'rank', public._rank(public._effective_rp(c.user_id)))
           order by c.pos), '[]'::jsonb)
    into result
  from cur_rank c
  join public.profiles p on p.user_id = c.user_id
  left join public.inventory inv on inv.user_id = c.user_id
  left join prev_rank pr on pr.user_id = c.user_id;

  return jsonb_build_object('period', p_period, 'periodStart', start_day, 'players', result);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Only the RPCs are callable, and only when signed in.

revoke all on function
  public._check_friend_request_rate(uuid), public._relation(uuid, uuid), public._xp_level(bigint),
  public._title_span(int), public._rank(bigint), public._effective_rp(uuid), public._best_streak(uuid),
  public._player_card(uuid, uuid), public._user_by_username(text),
  public.search_players(text), public.get_public_profile(text, date),
  public.send_friend_request(text), public.cancel_friend_request(text), public.accept_friend_request(text),
  public.decline_friend_request(text), public.remove_friend(text), public.block_user(text), public.unblock_user(text),
  public.list_friends(), public.list_requests(), public.list_blocked(), public.friends_leaderboard(text, date)
from public, anon, authenticated;

grant execute on function
  public.search_players(text), public.get_public_profile(text, date),
  public.send_friend_request(text), public.cancel_friend_request(text), public.accept_friend_request(text),
  public.decline_friend_request(text), public.remove_friend(text), public.block_user(text), public.unblock_user(text),
  public.list_friends(), public.list_requests(), public.list_blocked(), public.friends_leaderboard(text, date)
to authenticated;
