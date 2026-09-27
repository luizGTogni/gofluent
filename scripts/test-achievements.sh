#!/usr/bin/env bash
# Tests achievements (migration 0028) against a throwaway Postgres in Docker, with every migration
# applied over a stub of Supabase's auth. Never touches the real project.
#   bash scripts/test-achievements.sh
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=gofluent-achievements-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null' EXIT
until docker exec "$NAME" psql -U postgres -h 127.0.0.1 -c 'select 1' >/dev/null 2>&1; do sleep 0.3; done

psql_() { docker exec -i "$NAME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -qAtX "$@"; }
psql_ < scripts/ledger-test/stubs.sql
for f in supabase/migrations/*.sql; do psql_ < "$f" >/dev/null; done

A=00000000-0000-0000-0000-00000000000a
B=00000000-0000-0000-0000-00000000000b
psql_ -c "insert into auth.users (id) values ('$A'), ('$B')"

as() { local uid=$1; shift; psql_ -c "set request.jwt.claim.sub = '$uid'; set role authenticated; $*"; }
sql() { psql_ -c "$*"; }
uuid() { cat /proc/sys/kernel/random/uuid; }

fails=0
check() { # check <label> <expected> <actual>
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1: expected [$2], got [$3]"; fails=$((fails + 1)); fi
}

DAY=$(sql "select (now() at time zone 'utc')::date")
track() { # track <user> <signals json> [day] [event id] -> unlocked ids
  as "$1" "select public.track_achievements('${4:-$(uuid)}', '$2', '${3:-$DAY}')"
}
unlocked() { sql "select coalesce(string_agg(achievement_id, ' ' order by achievement_id), '') from achievements where user_id = '$1'"; }
has() { sql "select count(*) from achievements where user_id = '$1' and achievement_id = '$2'"; }
metric() { as "$1" "select public.achievement_state() -> 'metrics' ->> '$2'"; }

echo "== catalogue"
ts=$(node --experimental-strip-types --no-warnings -e "
  import('./src/lib/achievements.ts').then((m) => console.log(m.ACHIEVEMENTS.map((d) => {
    const r = m.ACHIEVEMENT_REWARD[d.rarity];
    return [d.id, d.metric, d.target, Boolean(d.mask), r.coins, r.crystals].join('|');
  }).sort().join('\n')))")
db=$(sql "select id || '|' || metric || '|' || target || '|' || mask || '|' || coins || '|' || crystals from achievement_defs order by 1")
check "achievement_defs mirrors achievements.ts" "$ts" "$db"
signals=$(node --experimental-strip-types --no-warnings -e "
  import('./src/lib/achievements.ts').then((m) => console.log([...new Set(m.ACHIEVEMENTS.map((d) => d.metric))].sort().join(' ')))")
known=$(sql "select string_agg(m, ' ' order by m) from (select distinct d.metric m from achievement_defs d) x")
derived=$(as "$A" "select string_agg(k, ' ' order by k) from jsonb_object_keys(public.achievement_state() -> 'metrics') k")
missing=$(LC_ALL=C comm -23 <(tr ' ' '\n' <<<"$known" | LC_ALL=C sort) <(LC_ALL=C sort -u <(tr ' ' '\n' <<<"$derived") <(sql "select metric from achievement_signals")))
check "every metric is derived or a signal" "" "$missing"
check "level curve matches xp.ts (0, 1, 9, 10)" "0 1 9 10" "$(sql "select public._level(p) from unnest(array[499, 500, 11749, 11750]) p" | xargs)"

echo "== a first phrase"
sql "insert into study_days (user_id, day, seconds, phrases, xp) values ('$A', '$DAY', 60, 1, 30)"
E=$(uuid)
r1=$(track "$A" '[{"metric":"perfect","n":1}]' "$DAY" "$E")
check "Ignition and First Perfect unlocked, paid" "[\"first_perfect\", \"ignition\"] 40" "$(sql "select ('$r1'::jsonb -> 'unlocked')::text || ' ' || ('$r1'::jsonb -> 'wallet' ->> 'coins')")"
r2=$(track "$A" '[{"metric":"perfect","n":1}]' "$DAY" "$E")
check "same key: replayed, nothing twice" "true 40 1" "$(sql "select ('$r2'::jsonb ->> 'replayed') || ' ' || (select coins from wallet where user_id = '$A') || ' ' || (select value from achievement_counters where user_id = '$A' and metric = 'perfect')")"
r3=$(track "$A" '[]')
check "checking again unlocks nothing" "[] 0" "$(sql "select ('$r3'::jsonb -> 'unlocked')::text || ' ' || ('$r3'::jsonb -> 'reward' ->> 'coins')")"

echo "== signals"
track "$A" '[{"metric":"perfect","n":999},{"metric":"nonsense","n":5},{"metric":"perfect_row","n":-3}]' >/dev/null
check "add is capped per event, unknown and negative ignored" "2 0" \
  "$(metric "$A" perfect) $(sql "select count(*) from achievement_counters where user_id = '$A' and metric in ('nonsense', 'perfect_row')")"
track "$A" '[{"metric":"perfect_row","n":3}]' >/dev/null; track "$A" '[{"metric":"perfect_row","n":2}]' >/dev/null
check "max keeps the best: 3 perfect in a row" "3 1" "$(metric "$A" perfect_row) $(has "$A" planetary_alignment)"
track "$A" '[{"metric":"reviews_day","n":1}]' "$DAY" >/dev/null; track "$A" '[{"metric":"reviews_day","n":1}]' "$DAY" >/dev/null
track "$A" '[{"metric":"reviews_day","n":1}]' "$(sql "select '$DAY'::date - 1")" >/dev/null
check "dayadd: best day's count, a new day starts over" "2" "$(metric "$A" reviews_day)"
for d in 0 0 1 2; do track "$A" '[{"metric":"night_days","n":1}]' "$(sql "select '$DAY'::date - $d")" >/dev/null; done
check "day: distinct days counted" "3" "$(metric "$A" night_days)"
track "$A" '[{"metric":"modes_day","n":3}]' "$(sql "select '$DAY'::date - 1")" >/dev/null
track "$A" '[{"metric":"modes_day","n":28}]' >/dev/null
check "daybits: every mode, but over two days" "0" "$(has "$A" full_fleet)"
track "$A" '[{"metric":"modes_day","n":3}]' >/dev/null
check "daybits: every mode on the same day" "1" "$(has "$A" full_fleet)"
track "$A" '[{"metric":"difficulties","n":1}]' >/dev/null; track "$A" '[{"metric":"difficulties","n":6}]' >/dev/null
check "bits: three of four difficulties" "0" "$(has "$A" the_climb)"
track "$A" '[{"metric":"difficulties","n":1032}]' >/dev/null
check "bits: the fourth (extra bits dropped)" "1 15" "$(has "$A" the_climb) $(metric "$A" difficulties)"

echo "== derived"
sql "insert into study_days (user_id, day, seconds) select '$B', g::date, 60 from generate_series('$DAY'::date - 13, '$DAY'::date - 7, '1 day') g;
     insert into study_days (user_id, day, seconds) values ('$B', '$DAY', 60)"
track "$B" '[]' >/dev/null
check "a 7-day run and the return after 6 days away" "7 6" "$(metric "$B" best_streak) $(metric "$B" away_return)"
check "orbit 3 and 7, a full week, a weekend" "1 1 1 1" "$(has "$B" orbit_3) $(has "$B" orbit_7) $(has "$B" full_week) $(has "$B" lunar_weekend)"
check "not back in orbit yet (6 days away)" "0" "$(has "$B" back_in_orbit)"
sql "update player_stats set xp = 11750, rp = 11750 where user_id = '$B'; insert into player_stats (user_id, xp, rp) select '$B', 11750, 11750 where not exists (select 1 from player_stats where user_id = '$B')"
sql "insert into reward_grants (user_id, grant_key) values ('$B', 'cefr:B1')"
sql "insert into phrases (text, translation, level, kind, audio_path, planet) values ('Hi there', 'Oi', 1, 'phrase', '/a.mp3', 'venus')"
sql "insert into planet_stats (user_id, planet, played, solid, entered_at) values ('$B', 'venus', 1, 1, now())"
track "$B" '[]' >/dev/null
check "level 10, three stars, CEFR A2 and B1, Venus" "1 1 1 1 1" "$(has "$B" level_10) $(has "$B" three_stars) $(has "$B" cefr_a2) $(has "$B" cefr_b1) $(has "$B" venus_landing)"
check "not C1" "0" "$(has "$B" cefr_c1)"

echo "== paying once"
sql "update wallet set coins = 0, crystals = 0 where user_id = '$B'; delete from achievements where user_id = '$B'; delete from reward_grants where user_id = '$B' and grant_key like 'achievement:%'"
for _ in 1 2 3 4 5; do track "$B" '[]' >/dev/null & done; wait
expected=$(sql "select sum(coins) || ',' || sum(crystals) from achievement_defs d join achievements a on a.achievement_id = d.id where a.user_id = '$B'")
check "5 parallel checks: each unlock paid once" "$expected" "$(sql "select coins || ',' || crystals from wallet where user_id = '$B'")"
check "grants recorded once each" "$(unlocked "$B" | wc -w)" "$(sql "select count(*) from reward_grants where user_id = '$B' and grant_key like 'achievement:%'")"

echo "== access"
check "client can't write counters" "rejected" "$(as "$A" "insert into achievement_counters (user_id, metric, value) values ('$A', 'perfect', 999)" 2>/dev/null || echo rejected)"
check "client can't unlock directly" "rejected" "$(as "$A" "insert into achievements (user_id, achievement_id) values ('$A', 'supernova')" 2>/dev/null || echo rejected)"
check "others' achievements unreadable" "0" "$(as "$A" "select count(*) from achievements where user_id = '$B'")"
check "anon can't track" "rejected" "$(psql_ -c "set role anon; select public.track_achievements('$(uuid)', '[]', current_date)" 2>/dev/null || echo rejected)"
check "day far from the clock rejected" "rejected" "$(track "$A" '[]' "$(sql "select '$DAY'::date - 30")" 2>/dev/null || echo rejected)"

echo
if (( fails )); then echo "$fails failed"; exit 1; fi
echo "all passed"
