-- Lunar Coins came too fast: at 0.5 coin per XP one clean phrase paid more than an Oxygen Extra
-- (40) and a short session bought several Streak Shields (80). A phrase now pays 1 coin per 6 XP
-- (COINS_PER_XP = 1 / 6 in src/lib/economy.ts, at 3 XP per word), and quest
-- rewards matter again. Balances already earned are kept.

create or replace function public.complete_phrase(
  p_event_id  uuid,
  p_planet    text,
  p_words     int,
  p_xp        int,
  p_rp_delta  int,
  p_solid     boolean,
  p_no_hint   boolean,
  p_seconds   int,
  p_quests    jsonb,
  p_local_day date
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  saved jsonb;
  v_coins int;
  p record;
  ps record;
  v_planet jsonb;
  sd record;
  quests jsonb;
begin
  saved := public._event_begin(uid, p_event_id, 'complete_phrase', jsonb_build_object(
    'planet', p_planet, 'words', p_words, 'xp', p_xp, 'rp_delta', p_rp_delta, 'solid', p_solid,
    'no_hint', p_no_hint, 'seconds', p_seconds, 'quests', p_quests, 'local_day', p_local_day));
  if saved is not null then return saved; end if;

  perform public._check_day(p_local_day, 7);
  -- 3 XP per word (10 before 0023; the ceiling stays loose for phrases queued by older clients) × (1 + 0.5 first try + 0.25 fast + 0.25 no help + 0.5 comeback) × 2.2 (Eclipse).
  if p_words is null or p_words not between 1 and 60 then raise exception 'bad word count' using errcode = '22023'; end if;
  if p_xp is null or p_xp not between 0 and p_words * 55 then raise exception 'xp over ceiling' using errcode = '22023'; end if;
  if p_rp_delta is null or p_rp_delta > 2 * p_xp then raise exception 'rp over ceiling' using errcode = '22023'; end if;

  perform public._ensure_rows(uid);
  v_coins := round(p_xp / 6.0);

  update public.player_stats
     set xp = xp + p_xp,
         rp = greatest(0, least(xp + p_xp, rp + p_rp_delta)),
         last_active_at = now(),
         updated_at = now()
   where user_id = uid
  returning xp, rp, last_active_at into p;

  if p_planet is not null then
    insert into public.planet_stats as s (user_id, planet, played, solid, entered_at)
    values (uid, p_planet, 1, coalesce(p_solid, false)::int, now())
    on conflict (user_id, planet) do update
      set played = s.played + 1,
          solid = s.solid + excluded.solid,
          entered_at = coalesce(s.entered_at, excluded.entered_at),
          updated_at = now()
    returning planet, played, solid, entered_at into ps;
    v_planet := jsonb_build_object('planet', ps.planet, 'played', ps.played, 'solid', ps.solid, 'enteredAt', ps.entered_at);
  end if;

  insert into public.study_days as d (user_id, day, seconds, phrases, xp)
  values (uid, p_local_day, least(greatest(coalesce(p_seconds, 1), 1), 3600), 1, p_xp)
  on conflict (user_id, day) do update
    set seconds = d.seconds + excluded.seconds, phrases = d.phrases + 1, xp = d.xp + excluded.xp
  returning day, seconds, phrases, xp into sd;

  update public.wallet set coins = coins + v_coins, updated_at = now() where user_id = uid;
  if p_no_hint then
    update public.inventory set no_hint_count = no_hint_count + 1, updated_at = now() where user_id = uid;
  end if;

  quests := public._advance_quests(uid, p_local_day, p_quests);

  return public._event_end(uid, p_event_id, jsonb_build_object(
    'player', jsonb_build_object('xp', p.xp, 'rp', p.rp, 'lastActiveAt', p.last_active_at),
    'coins', v_coins,
    'wallet', public._wallet(uid),
    'planet', v_planet,
    'day', jsonb_build_object('day', sd.day, 'seconds', sd.seconds, 'phrases', sd.phrases, 'xp', sd.xp),
    'noHintCount', (select no_hint_count from public.inventory where user_id = uid),
    'quests', quests));
end $$;
