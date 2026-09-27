-- The client now writes progress and the economy only through the ledger RPCs (0018), so the
-- direct write policies go: the server is the only writer of balances, XP and counters.

-- A replayed event says so, so a client doesn't mistake the saved (possibly stale) state for news.
create or replace function public._event_begin(uid uuid, p_id uuid, p_kind text, p_payload jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare saved record;
begin
  if p_id is null then raise exception 'event id required' using errcode = '22023'; end if;
  insert into public.game_events (id, user_id, kind, payload) values (p_id, uid, p_kind, p_payload)
  on conflict do nothing;
  if found then return null; end if;
  select kind, result into saved from public.game_events where id = p_id and user_id = uid;
  if not found or saved.kind <> p_kind then
    raise exception 'event id % already used', p_id using errcode = '23505';
  end if;
  return saved.result || '{"replayed": true}';
end $$;

-- The first visit to a planet. Idempotent by nature: entered_at is only ever set once.
create function public.enter_planet(p_planet text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  ps record;
begin
  insert into public.planet_stats as s (user_id, planet, entered_at) values (uid, p_planet, now())
  on conflict (user_id, planet) do update set entered_at = coalesce(s.entered_at, excluded.entered_at)
  returning planet, played, solid, entered_at into ps;
  return jsonb_build_object('planet', ps.planet, 'played', ps.played, 'solid', ps.solid, 'enteredAt', ps.entered_at);
end $$;

revoke all on function public.enter_planet(text) from public, anon, authenticated;
grant execute on function public.enter_planet(text) to authenticated;

drop policy "wallet: insert own"         on public.wallet;
drop policy "wallet: update own"         on public.wallet;
drop policy "player_stats: insert own"   on public.player_stats;
drop policy "player_stats: update own"   on public.player_stats;
drop policy "planet_stats: insert own"   on public.planet_stats;
drop policy "planet_stats: update own"   on public.planet_stats;
drop policy "study_days: insert own"     on public.study_days;
drop policy "study_days: update own"     on public.study_days;
drop policy "freeze_days: insert own"    on public.freeze_days;
drop policy "quest_progress: insert own" on public.quest_progress;
drop policy "quest_progress: update own" on public.quest_progress;
drop policy "badges: insert own"         on public.badges;
drop policy "inventory: insert own"      on public.inventory;
drop policy "inventory: update own"      on public.inventory;

-- Rewards the old client paid between 0018 and this migration are recorded too (same backfill as
-- 0018; already recorded keys are skipped).
insert into public.reward_grants (user_id, grant_key)
select user_id, 'badge:' || badge_id from public.badges
union
select user_id, 'quest:' || quest_id || ':' || period_key from public.quest_progress where claimed
-- Every title up to the one lifetime XP reaches: rank points never exceed XP, so no promotion paid
-- so far can be above it.
union
select user_id, 'rank:' || i from public.player_stats, generate_series(1, public._rank_index(xp)) i
union
select user_id, 'interest:' || last_interest_day from public.wallet where last_interest_day is not null
union
select user_id, 'freeze:' || day from public.freeze_days
-- Streak milestones: every run of covered days, keyed by its first day, for each milestone it reached.
union
select user_id, 'milestone:' || m || ':' || start
from (
  select user_id, min(day) as start, count(*) as len
  from (
    select user_id, day, day - (row_number() over (partition by user_id order by day))::int as run
    from (select user_id, day from public.study_days where seconds > 0 union select user_id, day from public.freeze_days) covered
  ) runs
  group by user_id, run
) streaks, unnest(array[7, 30, 100, 365]) m
where len >= m
on conflict do nothing;
