-- Idempotent game ledger. Clients stop writing absolute balances, XP and counters: they send
-- intents with an idempotency key, and these functions apply deltas atomically on the server and
-- return the resulting state. Repeating an intent with the same key is a no-op that returns the
-- same result, so retries, double clicks, StrictMode and offline replays are all safe.
--
-- Keys:
--   * game_events.id: a random uuid the client makes once per attempt (a phrase, a purchase).
--   * reward_grants.grant_key: deterministic, for rewards that are paid once ever:
--       milestone:<days>:<streak start> · rank:<index> · cefr:<level> · badge:<id> ·
--       quest:<id>:<periodKey> · interest:<local day> · freeze:<covered day>
--
-- Validation is partial for now: a phrase's XP still comes from the client, bounded by a ceiling
-- (words × the best possible multiplier); quest ticks are capped at each quest's target; CEFR
-- level-ups are not verified. Full server-side scoring comes later.

create table public.game_events (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null,
  payload    jsonb not null default '{}',
  result     jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.reward_grants (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grant_key  text not null check (char_length(grant_key) <= 80),
  created_at timestamptz not null default now(),
  primary key (user_id, grant_key)
);

-- Server copies of the reward and price tables, so the client never says how much it is owed.
-- quest_defs mirrors QUESTS in src/lib/quests.ts; keep them in step.
create table public.quest_defs (
  id       text primary key,
  period   text not null check (period in ('daily','weekly')),
  target   int  not null check (target > 0),
  coins    int  not null default 0,
  crystals int  not null default 0
);

insert into public.quest_defs (id, period, target, coins, crystals) values
  ('d_full_flight',  'daily',  1,  15, 0),
  ('d_five_clean',   'daily',  5,  15, 0),
  ('d_review_eight', 'daily',  8,  15, 0),
  ('w_five_days',    'weekly', 5,  60, 1),
  ('w_new_words',    'weekly', 30, 60, 1),
  ('w_perfect',      'weekly', 15, 60, 1),
  ('w_time_attack',  'weekly', 8,  60, 1),
  ('w_survival',     'weekly', 10, 60, 1),
  ('w_storm',        'weekly', 1,  60, 1),
  ('w_blind',        'weekly', 5,  60, 1);

-- Mirrors src/lib/shop.ts. Cosmetics (bought with Crystals) get rows here when they ship.
create table public.shop_items (
  kind     text not null check (kind in ('oxygen','freeze','cosmetic')),
  item_id  text not null,
  coins    int  not null default 0 check (coins >= 0),
  crystals int  not null default 0 check (crystals >= 0),
  primary key (kind, item_id)
);

insert into public.shop_items (kind, item_id, coins) values ('oxygen', 'oxygen', 40), ('freeze', 'freeze', 80);

alter table public.game_events   enable row level security;
alter table public.reward_grants enable row level security;
alter table public.quest_defs    enable row level security;
alter table public.shop_items    enable row level security;

-- Read-only to clients: every write goes through the functions below.
create policy "game_events: read own"   on public.game_events   for select using (user_id = (select auth.uid()));
create policy "reward_grants: read own" on public.reward_grants for select using (user_id = (select auth.uid()));
create policy "quest_defs: read"        on public.quest_defs    for select using (true);
create policy "shop_items: read"        on public.shop_items    for select using (true);

-- ---------------------------------------------------------------------------------------------
-- Helpers (internal: not callable by clients)

create function public._require_uid() returns uuid
language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  return uid;
end $$;

-- The client's local day must be near the server's clock. `back` days of slack let an offline
-- outbox replay phrases from recent days; +1 covers time zones ahead of UTC.
create function public._check_day(d date, back int) returns void
language plpgsql stable set search_path = '' as $$
declare utc date := (now() at time zone 'utc')::date;
begin
  if d is null or d < utc - back or d > utc + 1 then
    raise exception 'local day % out of range', d using errcode = '22023';
  end if;
end $$;

create function public._ensure_rows(uid uuid) returns void
language sql set search_path = '' as $$
  insert into public.wallet (user_id) values (uid) on conflict do nothing;
  insert into public.player_stats (user_id) values (uid) on conflict do nothing;
  insert into public.inventory (user_id) values (uid) on conflict do nothing;
$$;

create function public._wallet(uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('coins', coins, 'crystals', crystals, 'freezes', freezes) from public.wallet where user_id = uid),
    jsonb_build_object('coins', 0, 'crystals', 0, 'freezes', 0));
$$;

-- Starts an idempotent event. Returns null when this call owns the event (go ahead and apply it),
-- or the saved result of the call that already applied it. A concurrent call with the same id
-- waits on the primary key until the first one commits, then reads its result.
create function public._event_begin(uid uuid, p_id uuid, p_kind text, p_payload jsonb) returns jsonb
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
  return saved.result;
end $$;

create function public._event_end(uid uuid, p_id uuid, p_result jsonb) returns jsonb
language sql set search_path = '' as $$
  update public.game_events set result = p_result where id = p_id and user_id = uid;
  select p_result;
$$;

-- A studied day has seconds > 0; a covered day is studied or bridged by a Streak Shield.
create function public._studied(uid uuid, d date) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.study_days where user_id = uid and day = d and seconds > 0);
$$;

create function public._covered(uid uuid, d date) returns boolean
language sql stable set search_path = '' as $$
  select public._studied(uid, d) or exists (select 1 from public.freeze_days where user_id = uid and day = d);
$$;

-- computeStreak(...).current from src/lib/streak.ts.
create function public._streak(uid uuid, today date) returns int
language plpgsql stable set search_path = '' as $$
declare
  cursor_day date := case when public._studied(uid, today) then today else today - 1 end;
  n int := 0;
begin
  while public._covered(uid, cursor_day) loop
    n := n + 1;
    cursor_day := cursor_day - 1;
  end loop;
  return n;
end $$;

-- rankOf(rp).index from src/lib/ranks.ts: level from totalXpForLevel(l) = 6l² + 44l, then the
-- title whose level range holds it (TITLES in src/lib/titles.ts).
create function public._rank_index(points bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare lvl int := floor((-44 + sqrt(1936 + 24 * greatest(points, 0)::numeric)) / 12);
begin
  while 6 * (lvl + 1)::bigint * (lvl + 1) + 44 * (lvl + 1) <= points loop lvl := lvl + 1; end loop;
  while lvl > 0 and 6 * lvl::bigint * lvl + 44 * lvl > points loop lvl := lvl - 1; end loop;
  return (select count(*) - 1 from unnest(array[0, 11, 21, 31, 46, 61, 76, 91, 106, 121, 136, 151]) f where f <= lvl);
end $$;

create function public._period_key(period text, d date) returns text
language sql immutable set search_path = '' as $$
  select case when period = 'daily' then d::text else (d - (extract(isodow from d)::int - 1))::text end;
$$;

create function public._quest_row(q public.quest_progress) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', q.quest_id, 'periodKey', q.period_key, 'count', q.count, 'claimed', q.claimed);
$$;

-- Applies quest ticks [{id, op: 'add'|'max', n}] to the period holding `d`, capped at each
-- target. "Five-day week" is recounted from study_days rather than trusted from the client.
-- Returns the touched rows.
create function public._advance_quests(uid uuid, d date, ticks jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  t jsonb;
  def public.quest_defs;
  n int;
  row_out public.quest_progress;
  touched jsonb := '[]';
  pk text;
begin
  for t in select * from jsonb_array_elements(coalesce(ticks, '[]')) loop
    select * into def from public.quest_defs where id = t ->> 'id';
    if not found or def.id = 'w_five_days' then continue; end if;
    n := least(def.target, greatest(0, coalesce((t ->> 'n')::int, 0)));
    if n = 0 then continue; end if;
    pk := public._period_key(def.period, d);
    insert into public.quest_progress as q (user_id, quest_id, period_key, count)
    values (uid, def.id, pk, n)
    on conflict (user_id, quest_id, period_key) do update
      set count = least(def.target, case when t ->> 'op' = 'max' then greatest(q.count, n) else q.count + n end)
    returning * into row_out;
    touched := touched || public._quest_row(row_out);
  end loop;

  select * into def from public.quest_defs where id = 'w_five_days';
  pk := public._period_key('weekly', d);
  n := least(def.target, (select count(*) from public.study_days
                          where user_id = uid and seconds > 0 and day between pk::date and pk::date + 6));
  if n > 0 then
    insert into public.quest_progress as q (user_id, quest_id, period_key, count)
    values (uid, def.id, pk, n)
    on conflict (user_id, quest_id, period_key) do update set count = greatest(q.count, n)
    returning * into row_out;
    touched := touched || public._quest_row(row_out);
  end if;
  return touched;
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPCs

-- One finished phrase: XP and rank points, planet stats, the study day's volume, coins for the XP
-- (COINS_PER_XP = 0.5, decided here), the no-hint counter, and quest ticks — in one step.
-- p_rp_delta is the change the client computed from its faded rank points (effectiveRp), so it may
-- be negative; the result is kept within [0, xp].
create function public.complete_phrase(
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
  sd record;
  quests jsonb;
begin
  saved := public._event_begin(uid, p_event_id, 'complete_phrase', jsonb_build_object(
    'planet', p_planet, 'words', p_words, 'xp', p_xp, 'rp_delta', p_rp_delta, 'solid', p_solid,
    'no_hint', p_no_hint, 'seconds', p_seconds, 'quests', p_quests, 'local_day', p_local_day));
  if saved is not null then return saved; end if;

  perform public._check_day(p_local_day, 7);
  -- 10 XP per word × (1 + 0.5 first try + 0.25 fast + 0.25 no help + 0.5 comeback) × 2.2 (Eclipse).
  if p_words is null or p_words not between 1 and 60 then raise exception 'bad word count' using errcode = '22023'; end if;
  if p_xp is null or p_xp not between 0 and p_words * 55 then raise exception 'xp over ceiling' using errcode = '22023'; end if;
  if p_rp_delta is null or p_rp_delta > 2 * p_xp then raise exception 'rp over ceiling' using errcode = '22023'; end if;

  perform public._ensure_rows(uid);
  v_coins := round(p_xp * 0.5);

  update public.player_stats
     set xp = xp + p_xp,
         rp = greatest(0, least(xp + p_xp, rp + p_rp_delta)),
         last_active_at = now(),
         updated_at = now()
   where user_id = uid
  returning xp, rp, last_active_at into p;

  insert into public.planet_stats as s (user_id, planet, played, solid, entered_at)
  values (uid, p_planet, 1, coalesce(p_solid, false)::int, now())
  on conflict (user_id, planet) do update
    set played = s.played + 1,
        solid = s.solid + excluded.solid,
        entered_at = coalesce(s.entered_at, excluded.entered_at),
        updated_at = now()
  returning planet, played, solid, entered_at into ps;

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
    'planet', jsonb_build_object('planet', ps.planet, 'played', ps.played, 'solid', ps.solid, 'enteredAt', ps.entered_at),
    'day', jsonb_build_object('day', sd.day, 'seconds', sd.seconds, 'phrases', sd.phrases, 'xp', sd.xp),
    'noHintCount', (select no_hint_count from public.inventory where user_id = uid),
    'quests', quests));
end $$;

-- Quest progress outside a phrase (e.g. "Full flight" when a Classic session ends).
create function public.advance_quests(p_event_id uuid, p_quests jsonb, p_local_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  saved jsonb;
begin
  saved := public._event_begin(uid, p_event_id, 'advance_quests', jsonb_build_object('quests', p_quests, 'local_day', p_local_day));
  if saved is not null then return saved; end if;
  perform public._check_day(p_local_day, 7);
  return public._event_end(uid, p_event_id, jsonb_build_object('quests', public._advance_quests(uid, p_local_day, p_quests)));
end $$;

-- A once-ever reward, keyed deterministically. The amount comes from the key, never the client,
-- and each key is checked against what the server knows where it can be:
--   milestone:<7|30|100|365>:<start>  the streak from <start> covers that many days, and <start> begins it
--   rank:<index>                      the player's rank points reach that title
--   cefr:<A1..C2>                     not verified yet (at most six ever)
--   badge:<id>                        also records the badge; no_hint_100 needs 100 no-hint phrases
create function public.grant_reward(p_grant_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  milestone text[] := regexp_match(p_grant_key, '^milestone:(7|30|100|365):(\d{4}-\d{2}-\d{2})$');
  rank text[] := regexp_match(p_grant_key, '^rank:(\d{1,2})$');
  badge_match text[] := regexp_match(p_grant_key, '^badge:(first_perfect|no_hint_100|early_bird|night_owl)$');
  v_coins int := 0;
  v_crystals int := 0;
  v_freezes int := 0;
  days int;
  start date;
  badge text;
begin
  if milestone is not null then
    days := milestone[1]::int;
    start := milestone[2]::date;
    if public._covered(uid, start - 1)
       or (select count(*) from generate_series(start, start + days - 1, interval '1 day') g
           where public._covered(uid, g::date)) < days then
      return jsonb_build_object('granted', false, 'reason', 'not_earned', 'wallet', public._wallet(uid));
    end if;
    select r.c, r.k, r.f into v_coins, v_crystals, v_freezes
      from (values (7, 20, 5, 1), (30, 100, 20, 1), (100, 300, 60, 2), (365, 1000, 250, 3)) r(d, c, k, f)
     where r.d = days;
  elsif rank is not null then
    if rank[1]::int < 1 or rank[1]::int > coalesce((select public._rank_index(rp) from public.player_stats where user_id = uid), 0) then
      return jsonb_build_object('granted', false, 'reason', 'not_earned', 'wallet', public._wallet(uid));
    end if;
    v_crystals := 5;   -- CRYSTALS_PER_RANK_UP
  elsif p_grant_key ~ '^cefr:(A1|A2|B1|B2|C1|C2)$' then
    v_crystals := 10;  -- CRYSTALS_PER_CEFR_UP
  elsif badge_match is not null then
    badge := badge_match[1];
    if badge = 'no_hint_100' and coalesce((select no_hint_count from public.inventory where user_id = uid), 0) < 100 then
      return jsonb_build_object('granted', false, 'reason', 'not_earned', 'wallet', public._wallet(uid));
    end if;
  else
    raise exception 'unknown grant key %', p_grant_key using errcode = '22023';
  end if;

  insert into public.reward_grants (user_id, grant_key) values (uid, p_grant_key) on conflict do nothing;
  if not found then
    return jsonb_build_object('granted', false, 'reason', 'already_granted', 'wallet', public._wallet(uid));
  end if;

  if badge is not null then
    insert into public.badges (user_id, badge_id) values (uid, badge) on conflict do nothing;
  end if;
  perform public._ensure_rows(uid);
  update public.wallet
     set coins = coins + v_coins,
         crystals = crystals + v_crystals,
         freezes = freezes + v_freezes,
         updated_at = now()
   where user_id = uid;
  return jsonb_build_object('granted', true,
    'reward', jsonb_build_object('coins', v_coins, 'crystals', v_crystals, 'freezes', v_freezes),
    'wallet', public._wallet(uid));
end $$;

-- Claims a reached quest: the claimed false -> true flip and the payment in one transaction, with
-- the reward read from quest_defs. Concurrent claims serialize on the row; only one flips it.
create function public.claim_quest(p_quest_id text, p_period_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  def public.quest_defs;
begin
  select * into def from public.quest_defs where id = p_quest_id;
  if not found then raise exception 'unknown quest %', p_quest_id using errcode = '22023'; end if;

  update public.quest_progress set claimed = true
   where user_id = uid and quest_id = p_quest_id and period_key = p_period_key
     and not claimed and count >= def.target;
  if not found then
    return jsonb_build_object('claimed', false, 'wallet', public._wallet(uid));
  end if;

  insert into public.reward_grants (user_id, grant_key) values (uid, 'quest:' || p_quest_id || ':' || p_period_key)
  on conflict do nothing;
  perform public._ensure_rows(uid);
  update public.wallet
     set coins = coins + def.coins, crystals = crystals + def.crystals, updated_at = now()
   where user_id = uid;
  return jsonb_build_object('claimed', true,
    'reward', jsonb_build_object('coins', def.coins, 'crystals', def.crystals),
    'wallet', public._wallet(uid));
end $$;

-- Buys one item at the server's price. The wallet row is locked, so parallel purchases can't both
-- spend the same balance. A refusal is a result too: replaying the key returns it unchanged.
create function public.purchase(p_event_id uuid, p_item_kind text, p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  saved jsonb;
  item public.shop_items;
  w public.wallet;
  inv public.inventory;
  refusal text;
begin
  saved := public._event_begin(uid, p_event_id, 'purchase', jsonb_build_object('kind', p_item_kind, 'item', p_item_id));
  if saved is not null then return saved; end if;

  perform public._ensure_rows(uid);
  select * into w from public.wallet where user_id = uid for update;
  select * into inv from public.inventory where user_id = uid for update;
  select * into item from public.shop_items where kind = p_item_kind and item_id = p_item_id;

  if item.kind is null then
    refusal := 'unknown_item';
  elsif item.kind = 'cosmetic' and item.item_id = any (inv.cosmetics) then
    refusal := 'already_owned';
  elsif w.coins < item.coins or w.crystals < item.crystals then
    refusal := 'insufficient_funds';
  end if;
  if refusal is not null then
    return public._event_end(uid, p_event_id, jsonb_build_object('ok', false, 'reason', refusal,
      'wallet', public._wallet(uid), 'inventory', jsonb_build_object('oxygen', inv.oxygen, 'cosmetics', to_jsonb(inv.cosmetics))));
  end if;

  update public.wallet
     set coins = coins - item.coins,
         crystals = crystals - item.crystals,
         freezes = freezes + (item.kind = 'freeze')::int,
         updated_at = now()
   where user_id = uid;
  update public.inventory
     set oxygen = oxygen + (item.kind = 'oxygen')::int,
         cosmetics = case when item.kind = 'cosmetic' then array_append(cosmetics, item.item_id) else cosmetics end,
         updated_at = now()
   where user_id = uid
  returning * into inv;

  return public._event_end(uid, p_event_id, jsonb_build_object('ok', true,
    'wallet', public._wallet(uid), 'inventory', jsonb_build_object('oxygen', inv.oxygen, 'cosmetics', to_jsonb(inv.cosmetics))));
end $$;

-- Once per local day, on opening the app: spends a Streak Shield on a single missed day
-- (gapToFreeze in src/lib/streak.ts), then pays study interest (dailyInterest in
-- src/lib/economy.ts) on the streak up to yesterday. Each is guarded by its grant key, and the
-- wallet lock makes several tabs opening at once apply them once.
create function public.apply_daily(p_local_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  w public.wallet;
  gap date;
  frozen date;
  streak int;
  rate numeric;
  bonus int := 0;
begin
  perform public._check_day(p_local_day, 1);
  perform public._ensure_rows(uid);
  select * into w from public.wallet where user_id = uid for update;

  gap := p_local_day - 1;
  if not public._studied(uid, p_local_day) and not public._studied(uid, gap) and public._studied(uid, gap - 1)
     and w.freezes > 0
     and not exists (select 1 from public.freeze_days where user_id = uid and day = gap) then
    insert into public.reward_grants (user_id, grant_key) values (uid, 'freeze:' || gap) on conflict do nothing;
    if found then
      insert into public.freeze_days (user_id, day) values (uid, gap) on conflict do nothing;
      update public.wallet set freezes = freezes - 1, updated_at = now() where user_id = uid returning * into w;
      frozen := gap;
    end if;
  end if;

  streak := public._streak(uid, p_local_day - 1);
  if streak > 0 then
    insert into public.reward_grants (user_id, grant_key) values (uid, 'interest:' || p_local_day) on conflict do nothing;
    if found then
      rate := case when streak >= 365 then 0.03 when streak >= 100 then 0.02 when streak >= 30 then 0.01
                   when streak >= 14 then 0.005 else 0 end;
      bonus := floor(rate * least(w.coins, 5000));   -- INTEREST_CAP_BALANCE
      update public.wallet set coins = coins + bonus, last_interest_day = p_local_day, updated_at = now() where user_id = uid;
    end if;
  end if;

  return jsonb_build_object('frozenDay', frozen, 'interest', bonus, 'streak', streak, 'wallet', public._wallet(uid));
end $$;

-- Spends one oxygen tank if there is one. Idempotent per event, so a replay can't spend two.
create function public.use_oxygen(p_event_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  saved jsonb;
  left_over int;
begin
  saved := public._event_begin(uid, p_event_id, 'use_oxygen', '{}');
  if saved is not null then return saved; end if;
  update public.inventory set oxygen = oxygen - 1, updated_at = now() where user_id = uid and oxygen > 0
  returning oxygen into left_over;
  return public._event_end(uid, p_event_id, jsonb_build_object(
    'used', left_over is not null,
    'oxygen', coalesce(left_over, (select oxygen from public.inventory where user_id = uid), 0)));
end $$;

-- Only the RPCs are callable, and only when signed in.
revoke all on function
  public._require_uid(), public._check_day(date, int), public._ensure_rows(uuid), public._wallet(uuid),
  public._event_begin(uuid, uuid, text, jsonb), public._event_end(uuid, uuid, jsonb),
  public._studied(uuid, date), public._covered(uuid, date), public._streak(uuid, date),
  public._rank_index(bigint), public._period_key(text, date), public._quest_row(public.quest_progress),
  public._advance_quests(uuid, date, jsonb),
  public.complete_phrase(uuid, text, int, int, int, boolean, boolean, int, jsonb, date),
  public.advance_quests(uuid, jsonb, date), public.grant_reward(text), public.claim_quest(text, text),
  public.purchase(uuid, text, text), public.apply_daily(date), public.use_oxygen(uuid)
from public, anon, authenticated;

grant execute on function
  public.complete_phrase(uuid, text, int, int, int, boolean, boolean, int, jsonb, date),
  public.advance_quests(uuid, jsonb, date), public.grant_reward(text), public.claim_quest(text, text),
  public.purchase(uuid, text, text), public.apply_daily(date), public.use_oxygen(uuid)
to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Backfill: current balances stay as they are (they're the starting point); rewards already paid
-- are recorded so the new keys never pay them again.

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
