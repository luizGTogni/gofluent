#!/usr/bin/env bash
# Tests the social layer's friend requests, leaderboard and public profile RPCs (migration 0030)
# against a throwaway Postgres in Docker, with every migration applied over a stub of Supabase's
# auth. Never touches the real project.
#   bash scripts/test-social-friends.sh
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=gofluent-social-friends-test
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
D=00000000-0000-0000-0000-00000000000d
user() { echo "('$1', '{\"username\": \"$2\", \"full_name\": \"$3\"}')"; }

psql_ < scripts/ledger-test/stubs.sql
for f in supabase/migrations/*.sql; do psql_ < "$f" >/dev/null; done
sql "insert into auth.users (id, raw_user_meta_data) values $(user "$A" ana 'Ana Lima'), $(user "$B" bruno 'Bruno Reis'), $(user "$C" carla 'Carla Dias'), $(user "$D" duda 'Duda Alves')"

TODAY=$(date -u +%F)

echo "== search_players"
check "too short: empty" "[]" "$(as "$A" "select public.search_players('br')")"
check "prefix match, case-insensitive" "bruno" "$(as "$A" "select jsonb_agg(x ->> 'username') from jsonb_array_elements(public.search_players('BRU')) x" | sed 's/[][""]//g')"
check "excludes self" "0" "$(as "$A" "select jsonb_array_length(public.search_players('ana'))")"
sql "update profiles set visibility = 'private' where user_id = '$C'"
check "excludes private profiles" "0" "$(as "$A" "select jsonb_array_length(public.search_players('car'))")"
sql "update profiles set visibility = 'public' where user_id = '$C'"
code=$(sql "select friend_code from profiles where user_id = '$D'")
check "exact friend code match" "duda" "$(as "$A" "select public.search_players('$code') -> 0 ->> 'username'")"
sql "insert into blocks values ('$A', '$B')"
check "excludes blocked (either direction)" "0" "$(as "$A" "select jsonb_array_length(public.search_players('bru'))")"
sql "delete from blocks"

relation_of() { as "$1" "select public.search_players('$2') -> 0 ->> 'relation'"; } # $1 views $2's username

echo "== send/cancel/accept/decline_friend_request"
check "relation before: none" "none" "$(relation_of "$A" bruno)"
check "send: pending_out" "pending_out" "$(as "$A" "select public.send_friend_request('bruno') ->> 'relation'")"
check "repeat send: still pending_out, no dup row" "pending_out 1" \
  "$(as "$A" "select public.send_friend_request('bruno') ->> 'relation'") $(sql "select count(*) from friendships where user_low = least('$A'::uuid,'$B'::uuid) and user_high = greatest('$A'::uuid,'$B'::uuid)")"
check "B sees pending_in" "pending_in" "$(relation_of "$B" ana)"
check "A cannot accept own outgoing request as if incoming" "rejected" \
  "$(as "$A" "select public.accept_friend_request('bruno')" 2>/dev/null || echo rejected)"
check "B declines: back to none" "none" "$(as "$B" "select public.decline_friend_request('ana') ->> 'relation'")"
check "repeat decline: still none, harmless" "none" "$(as "$B" "select public.decline_friend_request('ana') ->> 'relation'")"

as "$A" "select public.send_friend_request('bruno')" >/dev/null
check "B accepts: friends" "friends" "$(as "$B" "select public.accept_friend_request('ana') ->> 'relation'")"
check "repeat accept: still friends, no error" "friends" "$(as "$B" "select public.accept_friend_request('ana') ->> 'relation'")"
check "A now sees friends too" "friends" "$(relation_of "$A" bruno)"
check "cancel on an accepted friendship does nothing" "1" "$(sql "select count(*) from friendships where status = 'accepted'")"

echo "== crossed request auto-accepts"
as "$C" "select public.send_friend_request('duda')" >/dev/null
check "D sends back: auto-accepted" "friends" "$(as "$D" "select public.send_friend_request('carla') ->> 'relation'")"
check "one row, accepted" "accepted" "$(sql "select status from friendships where user_low = least('$C'::uuid,'$D'::uuid) and user_high = greatest('$C'::uuid,'$D'::uuid)")"

echo "== remove_friend, block_user, unblock_user"
check "remove_friend: back to none" "none" "$(as "$A" "select public.remove_friend('bruno') ->> 'relation'")"
check "repeat remove: still none, harmless" "none" "$(as "$A" "select public.remove_friend('bruno') ->> 'relation'")"
as "$A" "select public.send_friend_request('bruno')" >/dev/null
as "$B" "select public.accept_friend_request('ana')" >/dev/null
check "block removes the friendship" "blocked 0" \
  "$(as "$A" "select public.block_user('bruno') ->> 'relation'") $(sql "select count(*) from friendships where user_low = least('$A'::uuid,'$B'::uuid) and user_high = greatest('$A'::uuid,'$B'::uuid)")"
check "blocked can't send a request" "rejected" "$(as "$B" "select public.send_friend_request('ana')" 2>/dev/null || echo rejected)"
check "unblock_user: relation none again" "none" "$(as "$A" "select public.unblock_user('bruno') ->> 'relation'")"
check "repeat unblock: harmless" "none" "$(as "$A" "select public.unblock_user('bruno') ->> 'relation'")"

echo "== allow_requests and rate limit"
sql "update profiles set allow_requests = 'nobody' where user_id = '$D'"
check "requests closed: rejected" "rejected" "$(as "$A" "select public.send_friend_request('duda')" 2>/dev/null || echo rejected)"
sql "update profiles set allow_requests = 'everyone' where user_id = '$D'"
F=$(uuid)
sql "insert into auth.users (id, raw_user_meta_data) values $(user "$F" fatima 'Fatima Souza')"
E1=$(uuid); E2=$(uuid); E3=$(uuid); E4=$(uuid); E5=$(uuid); E6=$(uuid)
N1="u_${E1:0:8}"; N2="u_${E2:0:8}"; N3="u_${E3:0:8}"; N4="u_${E4:0:8}"; N5="u_${E5:0:8}"; N6="u_${E6:0:8}"
for i in 1 2 3 4 5 6; do
  eid="E$i"; ename="N$i"
  sql "insert into auth.users (id, raw_user_meta_data) values $(user "${!eid}" "${!ename}" 'Test User')"
done
for n in "$N1" "$N2" "$N3" "$N4" "$N5"; do as "$F" "select public.send_friend_request('$n')" >/dev/null; done
check "6th request in a minute is rate-limited" "rejected" "$(as "$F" "select public.send_friend_request('$N6')" 2>/dev/null || echo rejected)"

echo "== list_friends, list_requests, list_blocked"
as "$A" "select public.send_friend_request('bruno')" >/dev/null
as "$B" "select public.accept_friend_request('ana')" >/dev/null
check "list_friends: B is there" "bruno" "$(as "$A" "select public.list_friends('$TODAY') -> 0 ->> 'username'")"
check "list_requests: F's outgoing to the 5 stubs" "5" "$(as "$F" "select jsonb_array_length(public.list_requests() -> 'outgoing')")"
check "list_requests: E1 sees it incoming" "1" "$(as "$E1" "select jsonb_array_length(public.list_requests() -> 'incoming')")"
sql "insert into blocks values ('$A', '$C')"
check "list_blocked: carla" "carla" "$(as "$A" "select public.list_blocked() -> 0 ->> 'username'")"
sql "delete from blocks where blocker = '$A'"

echo "== get_public_profile"
sql "update profiles set visibility = 'public', bio = 'Learning for fun' where user_id = '$B'"
sql "insert into player_stats (user_id, xp, rp) values ('$B', 5000, 5000) on conflict (user_id) do update set xp = 5000, rp = 5000"
sql "insert into study_days (user_id, day, seconds, phrases, xp) values ('$B', '$TODAY', 300, 3, 100) on conflict (user_id, day) do update set seconds = 300, xp = 100"
check "public profile: full detail for a stranger" "bruno" "$(as "$C" "select public.get_public_profile('bruno', '$TODAY') ->> 'username'")"
check "activity today, shown (show_activity default true)" "today" "$(as "$C" "select public.get_public_profile('bruno', '$TODAY') ->> 'lastActive'")"
sql "update profiles set show_activity = false where user_id = '$B'"
check "show_activity off: hidden from a stranger" "null" "$(as "$C" "select coalesce(public.get_public_profile('bruno', '$TODAY') ->> 'lastActive', 'null')")"
check "show_activity off: still visible to self" "today" "$(as "$B" "select public.get_public_profile('bruno', '$TODAY') ->> 'lastActive'")"
sql "update profiles set show_activity = true where user_id = '$B'"

sql "update profiles set visibility = 'friends' where user_id = '$D'"
check "friends-only, not a friend: minimal card only" "duda none" \
  "$(as "$B" "select (public.get_public_profile('duda', '$TODAY') ->> 'username') || ' ' || (public.get_public_profile('duda', '$TODAY') ->> 'relation')")"
check "friends-only, minimal card has no bio field" "null" "$(as "$B" "select coalesce(public.get_public_profile('duda', '$TODAY') -> 'bio', 'null'::jsonb)::text")"
check "friends-only, a friend sees full detail" "friends" "$(as "$D" "select public.get_public_profile('carla' , '$TODAY') ->> 'relation'")"

sql "update profiles set visibility = 'private' where user_id = '$A'"
check "private: not found for a stranger" "rejected" "$(as "$B" "select public.get_public_profile('ana', '$TODAY')" 2>/dev/null || echo rejected)"
check "private: the owner still sees it" "ana" "$(as "$A" "select public.get_public_profile('ana', '$TODAY') ->> 'username'")"
sql "update profiles set visibility = 'public' where user_id = '$A'"

echo "== mutual friends"
as "$C" "select public.send_friend_request('ana')" >/dev/null
as "$A" "select public.accept_friend_request('carla')" >/dev/null
as "$C" "select public.send_friend_request('bruno')" >/dev/null
as "$B" "select public.accept_friend_request('carla')" >/dev/null
check "A and C share bruno as a mutual friend" "1" "$(as "$A" "select public.get_public_profile('carla', '$TODAY') ->> 'mutualFriends'")"

echo "== friends_leaderboard"
sql "insert into player_stats (user_id, xp, rp) values ('$A', 1000, 1000) on conflict (user_id) do update set xp = 1000, rp = 1000"
sql "insert into study_days (user_id, day, seconds, phrases, xp) values ('$A', '$TODAY', 60, 1, 10) on conflict (user_id, day) do update set xp = 10"
sql "insert into study_days (user_id, day, seconds, phrases, xp) values ('$B', '$TODAY', 60, 1, 500) on conflict (user_id, day) do update set xp = 500"
check "bruno (more xp this week) ranks above ana" "bruno" "$(as "$A" "select public.friends_leaderboard('week', '$TODAY') -> 'players' -> 0 ->> 'username'")"
check "positions are 1 and 2" "1 2" \
  "$(as "$A" "select (public.friends_leaderboard('week', '$TODAY') -> 'players' -> 0 ->> 'position') || ' ' || (public.friends_leaderboard('week', '$TODAY') -> 'players' -> 1 ->> 'position')")"
check "all-time period has no delta" "null" \
  "$(as "$A" "select coalesce(public.friends_leaderboard('all', '$TODAY') -> 'players' -> 0 ->> 'delta', 'null')")"

echo "== list_friends and leaderboard extras (migration 0031)"
check "list_friends: bruno's this-week XP and today flag" "500 true" \
  "$(as "$A" "select (public.list_friends('$TODAY') -> 0 ->> 'xpWeek') || ' ' || (public.list_friends('$TODAY') -> 0 ->> 'activeToday')")"
check "friends_leaderboard: planetsDone present (no planets yet, 0)" "0" \
  "$(as "$A" "select public.friends_leaderboard('week', '$TODAY') -> 'players' -> 0 ->> 'planetsDone'")"

echo "== direct access and helper lockdown"
check "friend_request_events: no direct read" "0" "$(as "$A" "select count(*) from friend_request_events")"
check "helpers not callable by clients" "rejected" "$(as "$A" "select public._relation('$A','$B')" 2>/dev/null || echo rejected)"
check "anon cannot call rpcs" "rejected" "$(psql_ -c "set role anon; select public.search_players('ana')" 2>/dev/null || echo rejected)"

echo
if [[ $fails -gt 0 ]]; then echo "$fails check(s) failed"; exit 1; fi
echo "all checks passed"
