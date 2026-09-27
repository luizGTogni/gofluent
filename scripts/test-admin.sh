#!/usr/bin/env bash
# Tests the content admin RPCs (migration 0025) against a throwaway Postgres in Docker, with every
# migration applied over a stub of Supabase's auth. Never touches the real project.
#   bash scripts/test-admin.sh
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=gofluent-admin-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null' EXIT
until docker exec "$NAME" psql -U postgres -h 127.0.0.1 -c 'select 1' >/dev/null 2>&1; do sleep 0.3; done

psql_() { docker exec -i "$NAME" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 -qAtX "$@"; }
psql_ < scripts/ledger-test/stubs.sql
for f in supabase/migrations/*.sql; do psql_ < "$f" >/dev/null; done

ADMIN=00000000-0000-0000-0000-00000000000a
USER=00000000-0000-0000-0000-00000000000b
psql_ -c "insert into auth.users (id) values ('$ADMIN'), ('$USER'); insert into public.admins (user_id) values ('$ADMIN')"

as() { local uid=$1; shift; psql_ -c "set request.jwt.claim.sub = '$uid'; set role authenticated; $*"; }
sql() { psql_ -c "$*"; }
refused() { as "$@" >/dev/null 2>&1 && echo allowed || echo refused; }

fails=0
check() { # check <label> <expected> <actual>
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1: expected [$2], got [$3]"; fails=$((fails + 1)); fi
}

echo "== access"
check "admin is admin" "t" "$(as "$ADMIN" "select public.is_admin()")"
check "learner is not" "f" "$(as "$USER" "select public.is_admin()")"
check "learner can't save words" "refused" "$(refused "$USER" "select public.admin_save_words('[{\"text\":\"hi\",\"ipa\":\"/haɪ/\",\"pos\":\"interjection\"}]')")"
check "learner can't read the key" "refused" "$(refused "$USER" "select public.admin_ai_credentials()")"
check "learner sees no admins" "0" "$(as "$USER" "select count(*) from public.admins")"
check "learner sees no key row" "0" "$(as "$USER" "select count(*) from public.ai_settings")"
check "admin sees no key row either (RPCs only)" "0" "$(as "$ADMIN" "select count(*) from public.ai_settings")"
check "learner can't write phrases directly" "refused" "$(refused "$USER" "insert into public.phrases (text, translation, level, kind, audio_path) values ('x', 'x', 1, 'word', '/a')")"

echo "== ai settings"
check "fallback chain by default" '["google/gemma-4-31b-it", "mistralai/mistral-nemotron", "mistralai/mistral-large-2-instruct", "nvidia/nemotron-3-super-120b-a12b"]' "$(as "$ADMIN" "select public.admin_ai_settings() -> 'models'")"
as "$ADMIN" "select public.admin_save_ai_settings(array['a/one', ' ', 'b/two', 'a/one'], true, 'nvapi-secret-1234')" >/dev/null
check "blanks and repeats dropped, order kept" '["a/one", "b/two"]' "$(as "$ADMIN" "select public.admin_save_ai_settings(array['a/one', ' ', 'b/two', 'a/one'], true) -> 'models'")"
check "hint only, never the key" "…1234 true" "$(as "$ADMIN" "select (s->>'keyHint') || ' ' || (s->>'reasoning') from public.admin_ai_settings() s")"
check "five models refused" "refused" "$(refused "$ADMIN" "select public.admin_save_ai_settings(array['a','b','c','d','e'], false)")"
check "no model refused" "refused" "$(refused "$ADMIN" "select public.admin_save_ai_settings(array[' '], false)")"
check "null key keeps the saved one" '["nvapi-secret-1234"]' "$(as "$ADMIN" "select public.admin_ai_credentials() -> 'apiKeys'")"
as "$ADMIN" "select public.admin_save_ai_settings(array['a/one'], true, null, 'nvapi-second-5678')" >/dev/null
check "second key, in order" '["nvapi-secret-1234", "nvapi-second-5678"]' "$(as "$ADMIN" "select public.admin_ai_credentials() -> 'apiKeys'")"
check "second key shown as a hint" "…5678" "$(as "$ADMIN" "select public.admin_ai_settings() ->> 'keyHint2'")"
as "$ADMIN" "select public.admin_save_ai_settings(array['a/one'], true, '')" >/dev/null
check "first removed, second kept" '["nvapi-second-5678"]' "$(as "$ADMIN" "select public.admin_ai_credentials() -> 'apiKeys'")"
as "$ADMIN" "select public.admin_model_health(array['a/one'], '{}')" >/dev/null
check "failure recorded" "t" "$(as "$ADMIN" "select public.admin_ai_credentials() -> 'failures' ? 'a/one'")"
as "$ADMIN" "select public.admin_model_health('{}', array['a/one'])" >/dev/null
check "success clears it" "{}" "$(as "$ADMIN" "select public.admin_ai_credentials() -> 'failures'")"
check "learner can't record health" "refused" "$(refused "$USER" "select public.admin_model_health(array['x'], '{}')")"
as "$ADMIN" "select public.admin_save_ai_settings(array['a/one'], false, '', '')" >/dev/null
check "empty keys remove them" "[]" "$(as "$ADMIN" "select public.admin_ai_credentials() -> 'apiKeys'")"

echo "== words and phrases"
check "save words" "3" "$(as "$ADMIN" "select public.admin_save_words('[{\"text\":\"good\",\"ipa\":\"/ɡʊd/\",\"pos\":\"adjective\"},{\"text\":\"morning\",\"ipa\":\"/ˈmɔːrnɪŋ/\",\"pos\":\"noun\"},{\"text\":\"I\",\"ipa\":\"/aɪ/\",\"pos\":\"pronoun\"}]')")"
check "bad word refused" "refused" "$(refused "$ADMIN" "select public.admin_save_words('[{\"text\":\"good!\",\"ipa\":\"/x/\",\"pos\":\"noun\"}]')")"
P='[{"text":"good morning","translation":"bom dia","planet":"venus","words":[{"text":"good","pos":"adjective"},{"text":"morning","pos":"noun"}]}]'
check "insert phrase" '{"updated": 0, "inserted": 1}' "$(as "$ADMIN" "select public.admin_save_phrases('$P')")"
check "level, kind, audio" "1 phrase /audio/good-morning.mp3 venus" "$(sql "select level || ' ' || kind || ' ' || audio_path || ' ' || planet from public.phrases where text = 'good morning'")"
check "linked in order" "good morning" "$(sql "select string_agg(w.text, ' ' order by pw.word_index) from public.phrase_words pw join public.words w on w.id = pw.word_id")"
P2='[{"text":"good morning","translation":"bom dia!","planet":"earth","words":[{"text":"good","pos":"adjective"},{"text":"morning","pos":"noun"}]}]'
check "same text updates" '{"updated": 1, "inserted": 0}' "$(as "$ADMIN" "select public.admin_save_phrases('$P2')")"
check "one phrase, two links" "1 2" "$(sql "select (select count(*) from public.phrases) || ' ' || (select count(*) from public.phrase_words)")"
BAD='[{"text":"good night","translation":"boa noite","planet":"venus","words":[{"text":"good","pos":"adjective"},{"text":"night","pos":"noun"}]}]'
check "unknown word refused" "refused" "$(refused "$ADMIN" "select public.admin_save_phrases('$BAD')")"
MIS='[{"text":"good day","translation":"x","planet":"venus","words":[{"text":"good","pos":"adjective"},{"text":"morning","pos":"noun"}]}]'
check "text must match words" "refused" "$(refused "$ADMIN" "select public.admin_save_phrases('$MIS')")"
check "word in use can't go" "f" "$(as "$ADMIN" "select public.admin_delete_word((select id from public.words where text = 'good'))")"
check "unused word can go" "t" "$(as "$ADMIN" "select public.admin_delete_word((select id from public.words where text = 'I'))")"
as "$ADMIN" "select public.admin_delete_phrase((select id from public.phrases where text = 'good morning'))" >/dev/null
check "delete phrase and links" "0 0" "$(sql "select (select count(*) from public.phrases) || ' ' || (select count(*) from public.phrase_words)")"

echo
if (( fails )); then echo "$fails failed"; exit 1; fi
echo "all passed"
