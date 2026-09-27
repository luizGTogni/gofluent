#!/usr/bin/env bash
# Tests the social layer's privacy base (migration 0021) against a throwaway Postgres in Docker,
# with every migration applied over a stub of Supabase's auth. Never touches the real project.
#   bash scripts/test-social.sh
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=gofluent-social-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null' EXIT
until docker exec "$NAME" psql -U postgres -h 127.0.0.1 -c 'select 1' >/dev/null 2>&1; do sleep 0.3; done

psql_() { docker exec -i "$NAME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -qAtX "$@"; }
as() { local uid=$1; shift; psql_ -c "set request.jwt.claim.sub = '$uid'; set role authenticated; $*"; }
sql() { psql_ -c "$*"; }
uuid() { cat /proc/sys/kernel/random/uuid; }

fails=0
check() { # check <label> <expected> <actual>
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1: expected [$2], got [$3]"; fails=$((fails + 1)); fi
}

A=00000000-0000-0000-0000-00000000000a
B=00000000-0000-0000-0000-00000000000b
C=00000000-0000-0000-0000-00000000000c
user() { echo "('$1', '{\"username\": \"$2\", \"full_name\": \"$3\"}')"; }

# A and B sign up before the migration, so its backfill has profiles to cover; C after.
psql_ < scripts/ledger-test/stubs.sql
MARK=supabase/migrations/0021_social_privacy.sql
for f in supabase/migrations/*.sql; do [[ "$f" < "$MARK" ]] && psql_ < "$f" >/dev/null; done
sql "insert into auth.users (id, raw_user_meta_data) values $(user "$A" ana 'Ana Lima'), $(user "$B" bruno 'Bruno Reis')"
psql_ < "$MARK" >/dev/null
sql "insert into auth.users (id, raw_user_meta_data) values $(user "$C" carla 'Carla Dias')"
for f in supabase/migrations/*.sql; do [[ "$f" > "$MARK" ]] && psql_ < "$f" >/dev/null; done

echo "== friend codes"
check "backfilled and made on sign-up, all distinct" "3 3" "$(sql "select count(friend_code) || ' ' || count(distinct friend_code) from profiles")"
check "format: 8 unambiguous characters" "0" "$(sql "select count(*) from profiles where friend_code !~ '^[A-HJKMNP-Z2-9]{8}$'")"
check "defaults: friends, name hidden, activity shown, requests open" "friends false true everyone" \
  "$(sql "select visibility || ' ' || show_full_name || ' ' || show_activity || ' ' || allow_requests from profiles where user_id = '$C'")"

old=$(sql "select friend_code from profiles where user_id = '$A'")
E=$(uuid)
r1=$(as "$A" "select public.regenerate_friend_code('$E') ->> 'friendCode'")
r2=$(as "$A" "select public.regenerate_friend_code('$E') ->> 'friendCode'")
check "regenerated: a new code" "yes" "$([[ "$r1" != "$old" ]] && echo yes || echo no)"
check "same key: same code, no second roll" "$r1 $r1" "$r1 $(sql "select friend_code from profiles where user_id = '$A'")"
check "retry answer matches" "$r1" "$r2"
r3=$(as "$A" "select public.regenerate_friend_code('$(uuid)') ->> 'friendCode'")
check "new key: another code" "yes" "$([[ "$r3" != "$r1" ]] && echo yes || echo no)"
check "event id of another kind rejected" "rejected" "$(as "$A" "select public.use_oxygen('$E')" 2>/dev/null || echo rejected)"

echo "== update_profile_settings"
s=$(as "$A" "select public.update_profile_settings('public', true, false, 'nobody', '  Learning   English  for work ')")
check "saved and returned" "public true false nobody|Learning English for work" \
  "$(sql "select (j->>'visibility') || ' ' || (j->>'showFullName') || ' ' || (j->>'showActivity') || ' ' || (j->>'allowRequests') || '|' || (j->>'bio') from (select '$s'::jsonb j) x")"
check "repeating is harmless" "$s" "$(as "$A" "select public.update_profile_settings('public', true, false, 'nobody', 'Learning English for work')")"
as "$A" "select public.update_profile_settings('public', true, false, 'nobody', '   ')" >/dev/null
check "blank bio clears it" "null" "$(sql "select coalesce(bio, 'null') from profiles where user_id = '$A'")"
check "bio over 140 rejected" "rejected" "$(as "$A" "select public.update_profile_settings('public', true, true, 'everyone', repeat('a', 141))" 2>/dev/null || echo rejected)"
check "bad visibility rejected" "rejected" "$(as "$A" "select public.update_profile_settings('everyone', true, true, 'everyone', null)" 2>/dev/null || echo rejected)"
check "bad allow_requests rejected" "rejected" "$(as "$A" "select public.update_profile_settings('public', true, true, 'friends', null)" 2>/dev/null || echo rejected)"
check "anon cannot call" "rejected" "$(psql_ -c "set role anon; select public.update_profile_settings('public', true, true, 'everyone', null)" 2>/dev/null || echo rejected)"
check "only the caller's profile changed" "friends" "$(sql "select visibility from profiles where user_id = '$B'")"

echo "== direct access"
check "profiles: others' rows unreadable" "1" "$(as "$A" "select count(*) from profiles")"
check "profiles: time zone still writable" "1" "$(as "$A" "update profiles set time_zone = 'America/Sao_Paulo' where user_id = '$A' returning 1")"
check "profiles: privacy not writable directly" "rejected" "$(as "$A" "update profiles set visibility = 'private' where user_id = '$A'" 2>/dev/null || echo rejected)"
check "profiles: friend code not writable directly" "rejected" "$(as "$A" "update profiles set friend_code = 'AAAAAAAA' where user_id = '$A'" 2>/dev/null || echo rejected)"
check "friendships: no direct read" "0" "$(sql "insert into friendships values ('$A', '$B', '$A', 'accepted', now(), now())"; as "$A" "select count(*) from friendships")"
check "friendships: no direct write" "rejected" "$(as "$C" "insert into friendships (user_low, user_high, requested_by) values ('$A', '$C', '$C')" 2>/dev/null || echo rejected)"
check "blocks: no direct write" "rejected" "$(as "$C" "insert into blocks (blocker, blocked) values ('$C', '$A')" 2>/dev/null || echo rejected)"
check "helpers not callable by clients" "rejected" "$(as "$A" "select public._can_view_profile('$A', '$B')" 2>/dev/null || echo rejected)"

echo "== pair constraints"
check "reversed pair rejected" "rejected" "$(sql "insert into friendships (user_low, user_high, requested_by) values ('$B', '$A', '$A')" 2>/dev/null || echo rejected)"
check "crossed request is the same key" "rejected" "$(sql "insert into friendships (user_low, user_high, requested_by) values ('$A', '$B', '$B')" 2>/dev/null || echo rejected)"
check "requester outside the pair rejected" "rejected" "$(sql "insert into friendships (user_low, user_high, requested_by) values ('$A', '$C', '$B')" 2>/dev/null || echo rejected)"
check "accepted needs accepted_at" "rejected" "$(sql "insert into friendships (user_low, user_high, requested_by, status) values ('$A', '$C', '$A', 'accepted')" 2>/dev/null || echo rejected)"
check "self-block rejected" "rejected" "$(sql "insert into blocks values ('$A', '$A')" 2>/dev/null || echo rejected)"

echo "== visibility and blocks"
view() { sql "select public._can_view_profile('$1', '$2')"; }
# A is public, B is friends-only and friends with A, C is friends-only with no friends.
check "public: anyone" "t" "$(view "$C" "$A")"
check "friends: a friend" "t" "$(view "$A" "$B")"
check "friends: a stranger" "f" "$(view "$C" "$B")"
check "own profile always" "t" "$(view "$C" "$C")"
sql "update profiles set visibility = 'private' where user_id = '$B'"
check "private: not even a friend" "f" "$(view "$A" "$B")"
sql "insert into blocks values ('$A', '$C')"
check "block: blocked can't see the blocker" "f" "$(view "$C" "$A")"
check "block: the blocker can't see the blocked either" "f" "$(view "$A" "$C")"
sql "delete from blocks; insert into blocks values ('$C', '$A')"
check "block from the other side: same" "f f" "$(view "$A" "$C") $(view "$C" "$A")"
sql "delete from auth.users where id = '$C'"
check "deleting an account drops its blocks" "0" "$(sql "select count(*) from blocks")"

echo
if (( fails )); then echo "$fails failed"; exit 1; fi
echo "all passed"
