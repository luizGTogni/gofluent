-- Achievements: long-term goals, each unlocked once when a metric reaches its target, paying a
-- reward by rarity. The server decides every unlock (track_achievements): most metrics come from
-- what it already stores (study days, XP, planets, quests, wallet…); the rest are counters for
-- signals only the client sees (a perfect run, the mode, the local hour), ticked with the same
-- idempotency key as the phrase or session that produced them and capped per event.
--
-- achievement_defs mirrors ACHIEVEMENTS in src/lib/achievements.ts; keep them in step
-- (scripts/test-achievements.sh compares the two).

create table public.achievement_defs (
  id       text primary key,
  metric   text not null,
  target   bigint not null check (target > 0),
  -- A bit mask (every mode in a day, every difficulty): reached when all of target's bits are set.
  mask     boolean not null default false,
  coins    int not null default 0 check (coins >= 0),
  crystals int not null default 0 check (crystals >= 0)
);

-- The client signals the server accepts, how each is applied, and the most one event may add:
--   add      value += n                      max      value = greatest(value, n)
--   day      +1 on each new local day        dayadd   n added to today's count; value = best day
--   bits     value |= n                      daybits  today's mask |= n; value = best day's mask
create table public.achievement_signals (
  metric text primary key,
  op     text not null check (op in ('add','max','day','dayadd','bits','daybits')),
  max_n  bigint not null check (max_n > 0)
);

create table public.achievement_counters (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metric  text not null references public.achievement_signals (metric),
  value   bigint not null default 0,
  cur     bigint not null default 0,  -- today's count or mask, for the day ops
  day     date,
  primary key (user_id, metric)
);

create table public.achievements (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievement_defs (id),
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievement_defs     enable row level security;
alter table public.achievement_signals  enable row level security;
alter table public.achievement_counters enable row level security;
alter table public.achievements         enable row level security;

-- Read-only to clients: every write goes through track_achievements.
create policy "achievement_defs: read"     on public.achievement_defs     for select using (true);
create policy "achievement_signals: read"  on public.achievement_signals  for select using (true);
create policy "achievement_counters: read own" on public.achievement_counters for select using (user_id = (select auth.uid()));
create policy "achievements: read own"     on public.achievements         for select using (user_id = (select auth.uid()));

insert into public.achievement_signals (metric, op, max_n) values
  ('perfect',               'add',     1),
  ('perfect_row',           'max',     50),
  ('comebacks',             'add',     1),
  ('fast_row',              'max',     50),
  ('long_first_try',        'max',     1),
  ('reviews',               'add',     1),
  ('reviews_day',           'dayadd',  1),
  ('tricky_cleared',        'max',     1),
  ('tricky_removed',        'add',     20),
  ('reconquest',            'max',     1),
  ('sessions',              'add',     1),
  ('sessions_day',          'dayadd',  1),
  ('clean_sessions',        'add',     1),
  ('before_8',              'max',     1),
  ('before_6',              'max',     1),
  ('small_hours',           'max',     1),
  ('lunch',                 'max',     1),
  ('night_days',            'day',     1),
  ('shifts_day',            'daybits', 7),
  ('modes_day',             'daybits', 31),
  ('difficulties',          'bits',    15),
  ('time_attack_best',      'max',     200),
  ('time_attack_half',      'max',     1),
  ('survival_best',         'max',     500),
  ('survival_flawless',     'max',     500),
  ('storm_wins',            'add',     1),
  ('storm_eclipse_perfect', 'max',     1),
  ('blind_phrases',         'add',     1),
  ('eclipse_phrases',       'add',     1),
  ('eclipse_perfect_row',   'max',     50);

insert into public.achievement_defs (id, metric, target, mask, coins, crystals) values
  ('ignition', 'phrases', 1, false, 20, 0),
  ('liftoff', 'sessions', 1, false, 20, 0),
  ('orbit_3', 'best_streak', 3, false, 20, 0),
  ('orbit_7', 'best_streak', 7, false, 60, 0),
  ('orbit_14', 'best_streak', 14, false, 60, 0),
  ('orbit_30', 'best_streak', 30, false, 150, 3),
  ('orbit_60', 'best_streak', 60, false, 150, 3),
  ('orbit_100', 'best_streak', 100, false, 500, 10),
  ('orbit_365', 'best_streak', 365, false, 500, 10),
  ('lunar_weekend', 'weekend', 1, false, 20, 0),
  ('full_week', 'full_week', 1, false, 60, 0),
  ('five_moons', 'five_day_week', 1, false, 20, 0),
  ('monthly_mission', 'month_days', 20, false, 150, 3),
  ('first_light', 'before_8', 1, false, 20, 0),
  ('solar_dawn', 'before_6', 1, false, 60, 0),
  ('graveyard_shift', 'small_hours', 1, false, 60, 0),
  ('owl_on_duty', 'night_days', 5, false, 60, 0),
  ('hangar_break', 'lunch', 1, false, 20, 0),
  ('three_shifts', 'shifts_day', 7, true, 150, 3),
  ('shield_up', 'shields_used', 1, false, 20, 0),
  ('back_in_orbit', 'away_return', 7, false, 60, 0),
  ('reconquest', 'reconquest', 1, false, 60, 0),
  ('words_50', 'words', 50, false, 20, 0),
  ('words_100', 'words', 100, false, 20, 0),
  ('words_250', 'words', 250, false, 60, 0),
  ('words_500', 'words', 500, false, 150, 3),
  ('words_1000', 'words', 1000, false, 150, 3),
  ('words_2000', 'words', 2000, false, 500, 10),
  ('phrases_100', 'phrases', 100, false, 20, 0),
  ('phrases_500', 'phrases', 500, false, 60, 0),
  ('phrases_1000', 'phrases', 1000, false, 150, 3),
  ('phrases_5000', 'phrases', 5000, false, 500, 10),
  ('orbital_marathon', 'sessions_day', 5, false, 60, 0),
  ('orbital_ultra', 'sessions_day', 10, false, 150, 3),
  ('flight_hour', 'day_seconds', 1800, false, 20, 0),
  ('long_haul', 'day_seconds', 3600, false, 60, 0),
  ('max_thrust', 'day_xp', 1000, false, 60, 0),
  ('level_10', 'level', 10, false, 20, 0),
  ('level_25', 'level', 25, false, 60, 0),
  ('level_50', 'level', 50, false, 150, 3),
  ('level_100', 'level', 100, false, 500, 10),
  ('title_comet', 'rank', 1, false, 20, 0),
  ('title_cadet', 'rank', 2, false, 20, 0),
  ('title_astronaut', 'rank', 3, false, 60, 0),
  ('title_pilot', 'rank', 4, false, 60, 0),
  ('title_navigator', 'rank', 5, false, 60, 0),
  ('title_commander', 'rank', 6, false, 150, 3),
  ('title_admiral', 'rank', 8, false, 150, 3),
  ('title_legend', 'rank', 11, false, 500, 10),
  ('three_stars', 'rank_level', 8, false, 60, 0),
  ('venus_landing', 'planet_venus', 1, false, 20, 0),
  ('red_planet', 'planet_mars', 1, false, 60, 0),
  ('lord_of_rings', 'planet_saturn', 1, false, 150, 3),
  ('zenith', 'planet_zenith', 1, false, 500, 10),
  ('explorer', 'planets_visited', 3, false, 20, 0),
  ('grand_tour', 'planets_done', 10, false, 500, 10),
  ('cefr_a2', 'cefr', 2, false, 20, 0),
  ('cefr_b1', 'cefr', 3, false, 60, 0),
  ('cefr_b2', 'cefr', 4, false, 150, 3),
  ('cefr_c1', 'cefr', 5, false, 150, 3),
  ('cefr_c2', 'cefr', 6, false, 500, 10),
  ('mission_control', 'reviews', 100, false, 60, 0),
  ('command_center', 'reviews', 500, false, 150, 3),
  ('flight_checklist', 'reviews_day', 25, false, 20, 0),
  ('asteroid_dodged', 'tricky_cleared', 1, false, 60, 0),
  ('debris_cleared', 'tricky_removed', 10, false, 20, 0),
  ('logbook', 'saved', 25, false, 20, 0),
  ('black_box', 'saved', 100, false, 60, 0),
  ('laser_aim', 'perfect', 10, false, 20, 0),
  ('orbital_precision', 'perfect', 100, false, 60, 0),
  ('planetary_alignment', 'perfect_row', 3, false, 60, 0),
  ('perfect_constellation', 'perfect_row', 5, false, 150, 3),
  ('supernova', 'perfect_row', 10, false, 500, 10),
  ('clean_flight', 'clean_sessions', 1, false, 60, 0),
  ('gravity_bounce', 'comebacks', 1, false, 20, 0),
  ('gravity_slingshot', 'comebacks', 25, false, 150, 3),
  ('instinct_navigation', 'no_hint', 500, false, 500, 10),
  ('escape_velocity', 'fast_row', 10, false, 60, 0),
  ('long_transmission', 'long_first_try', 1, false, 60, 0),
  ('space_fold', 'time_attack_best', 10, false, 20, 0),
  ('hyperdrive', 'time_attack_best', 15, false, 150, 3),
  ('countdown', 'time_attack_half', 1, false, 60, 0),
  ('survivor', 'survival_best', 10, false, 20, 0),
  ('last_air', 'survival_best', 25, false, 150, 3),
  ('intact_hull', 'survival_flawless', 20, false, 150, 3),
  ('storm_chaser', 'storm_wins', 1, false, 20, 0),
  ('eye_of_storm', 'storm_wins', 10, false, 150, 3),
  ('perfect_storm', 'storm_eclipse_perfect', 1, false, 500, 10),
  ('keen_ears', 'blind_phrases', 10, false, 20, 0),
  ('perfect_pitch', 'blind_phrases', 100, false, 150, 3),
  ('single_listen', 'eclipse_perfect_row', 10, false, 150, 3),
  ('eclipse_lord', 'eclipse_phrases', 100, false, 500, 10),
  ('full_fleet', 'modes_day', 31, true, 60, 0),
  ('the_climb', 'difficulties', 15, true, 60, 0),
  ('orders_of_the_day', 'daily_quests', 1, false, 20, 0),
  ('tour_of_duty', 'all_dailies_streak', 7, false, 150, 3),
  ('weekly_report', 'all_weeklies', 1, false, 60, 0),
  ('lunar_vault', 'coins', 1000, false, 60, 0),
  ('orbital_yield', 'interest', 1, false, 60, 0),
  ('reserve_tank', 'oxygen_used', 1, false, 20, 0),
  ('emergency_stock', 'freezes', 3, false, 60, 0),
  ('space_style', 'cosmetics', 1, false, 20, 0);

-- ---------------------------------------------------------------------------------------------
-- Helpers (internal: not callable by clients)

-- levelFromXp in src/lib/xp.ts: totalXpForLevel(l) = 75l² + 425l.
create function public._level(points bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare lvl int := floor((-425 + sqrt(180625 + 300 * greatest(points, 0)::numeric)) / 150);
begin
  while 75 * (lvl + 1)::bigint * (lvl + 1) + 425 * (lvl + 1) <= points loop lvl := lvl + 1; end loop;
  while lvl > 0 and 75 * lvl::bigint * lvl + 425 * lvl > points loop lvl := lvl - 1; end loop;
  return lvl;
end $$;

-- Every metric an achievement can watch, derived from the learner's rows plus their counters.
create function public._achievement_metrics(uid uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  m jsonb;
  ps record;
  studied date[];
  daily_count int := (select count(*) from public.quest_defs where period = 'daily');
  weekly_count int := (select count(*) from public.quest_defs where period = 'weekly');
begin
  select coalesce(xp, 0) as xp, coalesce(rp, 0) as rp into ps from public.player_stats where user_id = uid;
  select coalesce(array_agg(day order by day), '{}') into studied from public.study_days where user_id = uid and seconds > 0;

  m := jsonb_build_object(
    'phrases', (select coalesce(sum(phrases), 0) from public.study_days where user_id = uid),

    -- The longest run of covered days (studied, or bridged by a Streak Shield).
    'best_streak', (
      select coalesce(max(len), 0) from (
        select count(*) as len from (
          select day, day - (row_number() over (order by day))::int as run from (
            select day from public.study_days where user_id = uid and seconds > 0
            union select day from public.freeze_days where user_id = uid) c) r
        group by run) runs),

    'weekend', (
      select count(*) from (
        select 1 from unnest(studied) d
        group by d - (extract(isodow from d)::int - 1)
        having bool_or(extract(isodow from d) = 6) and bool_or(extract(isodow from d) = 7)) w),
    'full_week', (
      select count(*) from (select 1 from unnest(studied) d group by d - (extract(isodow from d)::int - 1) having count(*) = 7) w),
    'five_day_week', (
      select count(*) from (select 1 from unnest(studied) d group by d - (extract(isodow from d)::int - 1) having count(*) >= 5) w),
    'month_days', (
      select coalesce(max(n), 0) from (select count(*) as n from unnest(studied) d group by date_trunc('month', d)) mo),
    'day_seconds', (select coalesce(max(seconds), 0) from public.study_days where user_id = uid),
    'day_xp', (select coalesce(max(xp), 0) from public.study_days where user_id = uid),
    -- Days away before coming back: the longest gap between two studied days.
    'away_return', (
      select coalesce(max(gap), 0) from (select d - lag(d) over (order by d) - 1 as gap from unnest(studied) d) g),

    'level', public._level(coalesce(ps.xp, 0)),
    'rank_level', public._level(coalesce(ps.rp, 0)),
    'rank', greatest(
      public._rank_index(coalesce(ps.rp, 0)),
      (select coalesce(max((regexp_match(grant_key, '^rank:(\d+)$'))[1]::int), 0)
         from public.reward_grants where user_id = uid and grant_key like 'rank:%')),

    'planets_visited', (select count(*) from public.planet_stats where user_id = uid and entered_at is not null),
    'cefr', (
      select coalesce(max(array_position(array['A1','A2','B1','B2','C1','C2'], substr(grant_key, 6))), 0)
        from public.reward_grants where user_id = uid and grant_key like 'cefr:%'),
    'words', (select count(*) from public.word_stats where user_id = uid and seen > 0),
    'saved', (select count(*) from public.saved_items where user_id = uid),
    'no_hint', (select coalesce(no_hint_count, 0) from public.inventory where user_id = uid),
    'shields_used', (select count(*) from public.freeze_days where user_id = uid),

    'daily_quests', (
      select count(*) from public.quest_progress q join public.quest_defs d on d.id = q.quest_id
       where q.user_id = uid and d.period = 'daily' and q.claimed),
    -- The longest run of consecutive days with every daily mission reached.
    'all_dailies_streak', (
      select coalesce(max(len), 0) from (
        select count(*) as len from (
          select day, day - (row_number() over (order by day))::int as run from (
            select q.period_key::date as day
              from public.quest_progress q join public.quest_defs d on d.id = q.quest_id
             where q.user_id = uid and d.period = 'daily' and q.count >= d.target
             group by q.period_key having count(*) = daily_count) full_days) r
        group by run) runs),
    'all_weeklies', (
      select count(*) from (
        select 1 from public.quest_progress q join public.quest_defs d on d.id = q.quest_id
         where q.user_id = uid and d.period = 'weekly' and q.count >= d.target
         group by q.period_key having count(*) = weekly_count) w),

    'coins', (select coalesce(coins, 0) from public.wallet where user_id = uid),
    'freezes', (select coalesce(freezes, 0) from public.wallet where user_id = uid),
    'interest', (select count(*) from public.reward_grants where user_id = uid and grant_key like 'interest:%'),
    'oxygen_used', (
      select count(*) from public.game_events
       where user_id = uid and kind = 'use_oxygen' and coalesce((result ->> 'used')::boolean, false)),
    'cosmetics', (select coalesce(cardinality(cosmetics), 0) from public.inventory where user_id = uid)
  );

  -- A planet's stop is finished with STOP_GOAL (10) solid phrases, or all of them if it has fewer.
  select m || jsonb_build_object(
           'planets_done', count(*) filter (where done),
           'planet_venus',  count(*) filter (where done and planet = 'venus'),
           'planet_mars',   count(*) filter (where done and planet = 'mars'),
           'planet_saturn', count(*) filter (where done and planet = 'saturn'),
           'planet_zenith', count(*) filter (where done and planet = 'zenith'))
    into m
    from (
      select s.planet, n.total > 0 and s.solid >= least(10, n.total) as done
        from public.planet_stats s
        join lateral (select count(*) as total from public.phrases p where p.planet = s.planet) n on true
       where s.user_id = uid) p;

  return m || coalesce((select jsonb_object_agg(metric, value) from public.achievement_counters where user_id = uid), '{}');
end $$;

-- Unlocks every achievement whose metric reached its target and pays each one once. Two calls at
-- once can't both pay: the achievements primary key lets only one insert through.
create function public._unlock_achievements(uid uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  m jsonb := public._achievement_metrics(uid);
  def public.achievement_defs;
  v bigint;
  unlocked jsonb := '[]';
  v_coins int := 0;
  v_crystals int := 0;
begin
  for def in
    select * from public.achievement_defs d
     where not exists (select 1 from public.achievements a where a.user_id = uid and a.achievement_id = d.id)
     order by d.id
  loop
    v := coalesce((m ->> def.metric)::bigint, 0);
    if (def.mask and v & def.target = def.target) or (not def.mask and v >= def.target) then
      insert into public.achievements (user_id, achievement_id) values (uid, def.id) on conflict do nothing;
      if found then
        insert into public.reward_grants (user_id, grant_key) values (uid, 'achievement:' || def.id) on conflict do nothing;
        unlocked := unlocked || to_jsonb(def.id);
        v_coins := v_coins + def.coins;
        v_crystals := v_crystals + def.crystals;
      end if;
    end if;
  end loop;

  if v_coins > 0 or v_crystals > 0 then
    perform public._ensure_rows(uid);
    update public.wallet set coins = coins + v_coins, crystals = crystals + v_crystals, updated_at = now() where user_id = uid;
  end if;

  return jsonb_build_object(
    'unlocked', unlocked,
    'reward', jsonb_build_object('coins', v_coins, 'crystals', v_crystals),
    'wallet', public._wallet(uid),
    'metrics', case when jsonb_array_length(unlocked) > 0 then public._achievement_metrics(uid) else m end);
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPCs

-- Applies the client's signals [{metric, n}] for one phrase or session, then unlocks whatever is
-- now reached. With no signals it only checks (after a purchase, a claim, on load). Keyed by an
-- event id: a repeat returns the first answer and changes nothing.
create function public.track_achievements(p_event_id uuid, p_signals jsonb, p_local_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  saved jsonb;
  s jsonb;
  sig public.achievement_signals;
  n bigint;
begin
  saved := public._event_begin(uid, p_event_id, 'track_achievements', jsonb_build_object('signals', p_signals, 'local_day', p_local_day));
  if saved is not null then return saved; end if;
  perform public._check_day(p_local_day, 7);

  for s in select * from jsonb_array_elements(coalesce(p_signals, '[]')) loop
    select * into sig from public.achievement_signals where metric = s ->> 'metric';
    if not found then continue; end if;
    n := coalesce((s ->> 'n')::bigint, 0);
    n := case when sig.op in ('bits','daybits') then n & sig.max_n else least(sig.max_n, greatest(0, n)) end;
    if n <= 0 then continue; end if;

    insert into public.achievement_counters as c (user_id, metric, value, cur, day)
    values (uid, sig.metric,
            case sig.op when 'day' then 1 else n end,
            case when sig.op in ('dayadd','daybits') then n else 0 end,
            case when sig.op in ('day','dayadd','daybits') then p_local_day end)
    on conflict (user_id, metric) do update set
      value = case sig.op
        when 'add'     then c.value + n
        when 'max'     then greatest(c.value, n)
        when 'bits'    then c.value | n
        when 'day'     then c.value + (c.day is distinct from p_local_day)::int
        when 'dayadd'  then greatest(c.value, case when c.day = p_local_day then c.cur + n else n end)
        when 'daybits' then greatest(c.value, case when c.day = p_local_day then c.cur | n else n end)
      end,
      cur = case sig.op
        when 'dayadd'  then case when c.day = p_local_day then c.cur + n else n end
        when 'daybits' then case when c.day = p_local_day then c.cur | n else n end
        else c.cur
      end,
      day = case when sig.op in ('day','dayadd','daybits') then p_local_day else c.day end;
  end loop;

  return public._event_end(uid, p_event_id, public._unlock_achievements(uid));
end $$;

-- What the achievements screen shows: every metric's value and what's unlocked, when. Read-only.
create function public.achievement_state() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'metrics', public._achievement_metrics(public._require_uid()),
    'unlocked', coalesce((select jsonb_object_agg(achievement_id, unlocked_at) from public.achievements
                          where user_id = public._require_uid()), '{}'));
$$;

revoke all on function public._level(bigint) from public, anon, authenticated;
revoke all on function public._achievement_metrics(uuid) from public, anon, authenticated;
revoke all on function public._unlock_achievements(uuid) from public, anon, authenticated;
revoke all on function public.track_achievements(uuid, jsonb, date) from public, anon, authenticated;
revoke all on function public.achievement_state() from public, anon, authenticated;
grant execute on function public.track_achievements(uuid, jsonb, date) to authenticated;
grant execute on function public.achievement_state() to authenticated;
