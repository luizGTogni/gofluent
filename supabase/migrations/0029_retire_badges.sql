-- Mission badges are folded into achievements (migration 0028): two systems doing the same job
-- with two screens and two tables. Three new achievement_defs cover the 4 old badges — early_bird
-- was strictly stricter than the existing "first_light" (before 8am), so it needs no new entry —
-- then every earned badge becomes the matching achievement, paid its due reward, and the badges
-- table goes. Mirrors ACHIEVEMENTS in src/lib/achievements.ts.

insert into public.achievement_defs (id, metric, target, mask, coins, crystals) values
  ('first_perfect', 'perfect', 1, false, 20, 0),
  ('no_hint_100', 'no_hint', 100, false, 150, 3),
  ('night_owl', 'night_days', 1, false, 20, 0);

-- grant_reward no longer knows badge:<id> keys.
create or replace function public.grant_reward(p_grant_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  milestone text[] := regexp_match(p_grant_key, '^milestone:(7|30|100|365):(\d{4}-\d{2}-\d{2})$');
  rank text[] := regexp_match(p_grant_key, '^rank:(\d{1,2})$');
  v_coins int := 0;
  v_crystals int := 0;
  v_freezes int := 0;
  days int;
  start date;
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
  else
    raise exception 'unknown grant key %', p_grant_key using errcode = '22023';
  end if;

  insert into public.reward_grants (user_id, grant_key) values (uid, p_grant_key) on conflict do nothing;
  if not found then
    return jsonb_build_object('granted', false, 'reason', 'already_granted', 'wallet', public._wallet(uid));
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

-- Every badge becomes its achievement, paid once (on_conflict guards a second run of this file).
with mapping (badge_id, achievement_id) as (
  values ('first_perfect', 'first_perfect'), ('no_hint_100', 'no_hint_100'),
         ('early_bird', 'first_light'), ('night_owl', 'night_owl')
), earned as (
  insert into public.achievements (user_id, achievement_id, unlocked_at)
  select b.user_id, m.achievement_id, b.unlocked_at
    from public.badges b join mapping m using (badge_id)
  on conflict do nothing
  returning user_id, achievement_id
), paid as (
  insert into public.reward_grants (user_id, grant_key)
  select user_id, 'achievement:' || achievement_id from earned
  on conflict do nothing
  -- reward_grants has no achievement_id column: pull it back out of the grant_key it just made.
  returning user_id, split_part(grant_key, ':', 2) as achievement_id
)
update public.wallet w
   set coins = w.coins + d.coins, crystals = w.crystals + d.crystals, updated_at = now()
  from paid p join public.achievement_defs d on d.id = p.achievement_id
 where w.user_id = p.user_id;

-- "badges: insert own" was already dropped in 0019 (writes moved to grant_reward).
drop policy "badges: read own" on public.badges;
drop table public.badges;
