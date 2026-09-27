#!/usr/bin/env bash
# Tests the idempotent ledger RPCs (migration 0018) against a throwaway Postgres in Docker, with
# every migration applied over a stub of Supabase's auth. Never touches the real project.
#   bash scripts/test-ledger.sh
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=gofluent-ledger-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null' EXIT
# The image's init runs a socket-only server first; TCP answers once the real one is up.
until docker exec "$NAME" psql -U postgres -h 127.0.0.1 -c 'select 1' >/dev/null 2>&1; do sleep 0.3; done

psql_() { docker exec -i "$NAME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -qAtX "$@"; }
psql_ < scripts/ledger-test/stubs.sql
for f in supabase/migrations/*.sql; do psql_ < "$f" >/dev/null; done

A=00000000-0000-0000-0000-00000000000a
B=00000000-0000-0000-0000-00000000000b
C=00000000-0000-0000-0000-00000000000c
psql_ -c "insert into auth.users (id) values ('$A'), ('$B'), ('$C')"

# Runs SQL as a signed-in user, the way PostgREST does, and prints the last result.
as() { local uid=$1; shift; psql_ -c "set request.jwt.claim.sub = '$uid'; set role authenticated; $*"; }
sql() { psql_ -c "$*"; }
uuid() { cat /proc/sys/kernel/random/uuid; }

fails=0
check() { # check <label> <expected> <actual>
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1: expected [$2], got [$3]"; fails=$((fails + 1)); fi
}

DAY=$(sql "select (now() at time zone 'utc')::date")
phrase() { # phrase <user> <event id> [xp]
  as "$1" "select public.complete_phrase('$2', 'earth', 4, ${3:-40}, ${3:-40}, true, true, 12,
    '[{\"id\":\"w_perfect\",\"op\":\"add\",\"n\":1},{\"id\":\"d_five_clean\",\"op\":\"max\",\"n\":3}]', '$DAY')"
}
state() { # coins, xp, phrases today, planet played, w_perfect count
  sql "select (select coins from wallet where user_id = '$1') || ',' || (select xp from player_stats where user_id = '$1') || ',' ||
    coalesce((select phrases from study_days where user_id = '$1' and day = '$DAY'), 0) || ',' ||
    coalesce((select played from planet_stats where user_id = '$1' and planet = 'earth'), 0) || ',' ||
    coalesce((select count from quest_progress where user_id = '$1' and quest_id = 'w_perfect'), 0)"
}

echo "== complete_phrase: same key twice"
E=$(uuid)
r1=$(phrase "$A" "$E"); r2=$(phrase "$A" "$E")
check "same result, flagged as a replay" "$r1 true" "$(sql "select ('$r2'::jsonb - 'replayed')::text || ' ' || ('$r2'::jsonb ->> 'replayed')")"
check "applied once (coins,xp,phrases,played,w_perfect)" "20,40,1,1,1" "$(state "$A")"
check "event recorded once" "1" "$(sql "select count(*) from game_events where user_id = '$A'")"
check "rp follows xp" "40" "$(sql "select rp from player_stats where user_id = '$A'")"
check "no-hint counter" "1" "$(sql "select no_hint_count from inventory where user_id = '$A'")"
check "five-day week counted from study days" "1" "$(sql "select count from quest_progress where user_id = '$A' and quest_id = 'w_five_days'")"

echo "== complete_phrase: validation"
check "xp over ceiling rejected" "rejected" "$(as "$A" "select public.complete_phrase('$(uuid)', 'earth', 2, 999, 0, true, true, 5, '[]', '$DAY')" 2>/dev/null || echo rejected)"
check "stale day rejected" "rejected" "$(as "$A" "select public.complete_phrase('$(uuid)', 'earth', 2, 10, 10, true, true, 5, '[]', '$DAY'::date - 30)" 2>/dev/null || echo rejected)"
check "event id reused for another kind rejected" "rejected" "$(as "$A" "select public.use_oxygen('$E')" 2>/dev/null || echo rejected)"
check "another user's event id rejected" "rejected" "$(phrase "$B" "$E" 2>/dev/null || echo rejected)"
check "anon cannot call" "rejected" "$(psql_ -c "set role anon; select public.apply_daily(current_date)" 2>/dev/null || echo rejected)"
check "client can't write the ledger" "rejected" "$(as "$A" "insert into reward_grants (user_id, grant_key) values ('$A', 'rank:9')" 2>/dev/null || echo rejected)"

check "client can't write the wallet (0019)" "0" "$(as "$A" "update wallet set coins = 99999 returning 1" | wc -l)"
check "client can't write study days (0019)" "rejected" "$(as "$A" "insert into study_days (user_id, day, seconds) values ('$A', '2020-01-01', 1)" 2>/dev/null || echo rejected)"

echo "== enter_planet"
first=$(as "$A" "select public.enter_planet('mars') ->> 'enteredAt'"); again=$(as "$A" "select public.enter_planet('mars') ->> 'enteredAt'")
check "entered once, kept" "$first" "$again"
check "earth stats kept on enter" "1" "$(as "$A" "select public.enter_planet('earth') ->> 'played'")"

echo "== complete_phrase off the journey (0020)"
played=$(sql "select coalesce(sum(played), 0) from planet_stats where user_id = '$A'")
xp=$(sql "select xp from player_stats where user_id = '$A'")
r=$(as "$A" "select public.complete_phrase('$(uuid)', null, 2, 20, 20, true, false, 5, '[]', '$DAY')")
check "no planet: planet stats untouched" "$played" "$(sql "select coalesce(sum(played), 0) from planet_stats where user_id = '$A'")"
check "no planet: xp still counted" "$((xp + 20))" "$(sql "select xp from player_stats where user_id = '$A'")"
check "no planet: answer has planet null" "null" "$(sql "select coalesce(('$r'::jsonb -> 'planet')::text, 'missing')")"

echo "== complete_phrase: 10 concurrent, different keys"
for _ in $(seq 10); do phrase "$B" "$(uuid)" >/dev/null & done; wait
check "sums exactly 10x" "200,400,10,10,10" "$(state "$B")"

echo "== complete_phrase: 5 concurrent, same key"
E=$(uuid)
for _ in $(seq 5); do phrase "$C" "$E" >/dev/null & done; wait
check "applied once" "20,40,1,1,1" "$(state "$C")"

echo "== outbox replay: 3 phrases sent, then all 3 resent"
K1=$(uuid); K2=$(uuid); K3=$(uuid)
before=$(sql "select xp from player_stats where user_id = '$C'")
for k in "$K1" "$K2" "$K3"; do phrase "$C" "$k" >/dev/null; done
for k in "$K1" "$K2" "$K3"; do phrase "$C" "$k" >/dev/null; done
check "3 applied, none twice" "$((before + 120))" "$(sql "select xp from player_stats where user_id = '$C'")"

echo "== claim_quest"
sql "update quest_progress set count = 15 where user_id = '$B' and quest_id = 'w_perfect'"
PK=$(sql "select period_key from quest_progress where user_id = '$B' and quest_id = 'w_perfect'")
coins=$(sql "select coins from wallet where user_id = '$B'")
for _ in 1 2; do as "$B" "select public.claim_quest('w_perfect', '$PK')" >/dev/null & done; wait
check "two devices: paid once" "$((coins + 60)),1" "$(sql "select coins || ',' || crystals from wallet where user_id = '$B'")"
check "repeat returns not claimed" "false" "$(as "$B" "select public.claim_quest('w_perfect', '$PK') ->> 'claimed'")"
check "unreached quest not claimable" "false" "$(as "$A" "select public.claim_quest('w_perfect', '$PK') ->> 'claimed'")"

echo "== purchase"
sql "update wallet set coins = 50 where user_id = '$A'"
E=$(uuid)
p1=$(as "$A" "select public.purchase('$E', 'oxygen', 'oxygen')"); p2=$(as "$A" "select public.purchase('$E', 'oxygen', 'oxygen')")
check "same key: same result" "$p1" "$(sql "select ('$p2'::jsonb - 'replayed')::text")"
check "same key: charged once" "10,1" "$(sql "select w.coins || ',' || i.oxygen from wallet w join inventory i using (user_id) where user_id = '$A'")"
sql "update wallet set coins = 80 where user_id = '$A'"
out=$(for _ in 1 2; do as "$A" "select coalesce(public.purchase('$(uuid)', 'freeze', 'freeze') ->> 'reason', 'ok')" & done; wait)
check "parallel, money for one: 1 ok + 1 insufficient" "insufficient_funds ok" "$(echo $out | tr ' ' '\n' | sort | xargs)"
check "balance after" "0,1" "$(sql "select coins || ',' || freezes from wallet where user_id = '$A'")"
check "price comes from the server" "unknown_item" "$(as "$A" "select public.purchase('$(uuid)', 'oxygen', 'free') ->> 'reason'")"
sql "insert into shop_items (kind, item_id, crystals) values ('cosmetic', 'halo_gold', 1); update wallet set crystals = 5 where user_id = '$A'"
as "$A" "select public.purchase('$(uuid)', 'cosmetic', 'halo_gold')" >/dev/null
check "cosmetic already owned refused" "already_owned" "$(as "$A" "select public.purchase('$(uuid)', 'cosmetic', 'halo_gold') ->> 'reason'")"

echo "== use_oxygen"
E=$(uuid)
as "$A" "select public.use_oxygen('$E')" >/dev/null; as "$A" "select public.use_oxygen('$E')" >/dev/null
check "same key spends one" "0" "$(sql "select oxygen from inventory where user_id = '$A'")"
check "none left: not used" "false" "$(as "$A" "select public.use_oxygen('$(uuid)') ->> 'used'")"

echo "== grant_reward"
g1=$(as "$A" "select public.grant_reward('cefr:A2')"); g2=$(as "$A" "select public.grant_reward('cefr:A2')")
check "first grants" "true" "$(echo "$g1" | grep -o '"granted": true' | grep -o true)"
check "second is a no-op" "already_granted" "$(echo "$g2" | grep -o 'already_granted')"
check "paid once" "14" "$(sql "select crystals from wallet where user_id = '$A'")"
check "rank above the player's refused" "not_earned" "$(as "$A" "select public.grant_reward('rank:5') ->> 'reason'")"
check "unknown key rejected" "rejected" "$(as "$A" "select public.grant_reward('interest:2020-01-01')" 2>/dev/null || echo rejected)"
check "badge recorded" "1" "$(as "$A" "select public.grant_reward('badge:early_bird')" >/dev/null; sql "select count(*) from badges where user_id = '$A'")"
check "no_hint_100 needs 100" "not_earned" "$(as "$A" "select public.grant_reward('badge:no_hint_100') ->> 'reason'")"
# A 7-day streak for C ending today.
sql "insert into study_days (user_id, day, seconds) select '$C', g::date, 60 from generate_series('$DAY'::date - 6, '$DAY'::date - 1, '1 day') g"
START=$(sql "select '$DAY'::date - 6")
check "milestone mid-streak refused" "not_earned" "$(as "$C" "select public.grant_reward('milestone:7:' || ('$START'::date + 1)) ->> 'reason'")"
for _ in 1 2 3; do as "$C" "select public.grant_reward('milestone:7:$START')" >/dev/null & done; wait
check "milestone paid once (crystals,freezes)" "5,1" "$(sql "select crystals || ',' || freezes from wallet where user_id = '$C'")"

echo "== apply_daily"
# B: studied up to 2 days ago, missed yesterday, has a shield; 30-day streak before the gap.
sql "delete from study_days where user_id = '$B';
     insert into study_days (user_id, day, seconds) select '$B', g::date, 60 from generate_series('$DAY'::date - 31, '$DAY'::date - 2, '1 day') g;
     update wallet set coins = 1000, freezes = 1 where user_id = '$B'"
for _ in 1 2 3; do as "$B" "select public.apply_daily('$DAY')" >/dev/null & done; wait
check "3 tabs: shield spent once, interest once (1% of 1000)" "1010,0" "$(sql "select coins || ',' || freezes from wallet where user_id = '$B'")"
check "gap day frozen" "1" "$(sql "select count(*) from freeze_days where user_id = '$B'")"
check "again: nothing more" "0" "$(as "$B" "select public.apply_daily('$DAY') ->> 'interest'")"
check "day far from the clock rejected" "rejected" "$(as "$B" "select public.apply_daily('$DAY'::date - 5)" 2>/dev/null || echo rejected)"

echo "== backfill (migration 0018 on existing data)"
# totalXpForLevel(11) = 1210 opens Comet, (21) = 3570 opens Cadet.
check "rank index matches ranks.ts" "0 0 1 1 2" "$(sql "select public._rank_index(r) from unnest(array[0, 1209, 1210, 3569, 3570]) r" | xargs)"
sql "delete from reward_grants; insert into badges (user_id, badge_id) values ('$B', 'night_owl') on conflict do nothing"
sql "$(sed -n '/^-- Backfill/,$p' supabase/migrations/0018_idempotent_ledger.sql)"
check "backfilled: badge, claimed quest, freeze, interest, milestones 7+30 of B's run" \
  "badge:night_owl freeze:$(sql "select '$DAY'::date - 1") interest:$DAY milestone:30:$(sql "select '$DAY'::date - 31") milestone:7:$(sql "select '$DAY'::date - 31") quest:w_perfect:$PK" \
  "$(sql "select string_agg(grant_key, ' ' order by grant_key) from reward_grants where user_id = '$B' and grant_key not like 'rank:%'")"

echo
if (( fails )); then echo "$fails failed"; exit 1; fi
echo "all passed"
