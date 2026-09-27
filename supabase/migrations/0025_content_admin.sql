-- Content admin: the /admin screen manages words and phrases in the database, which becomes the
-- source of truth for content (the app already reads it, see src/lib/content.ts). Only learners in
-- public.admins may write, and only through the security definer RPCs below. Add yourself once:
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security; -- no policies: read only via is_admin()

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create function public._require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
end $$;

-- ---- AI settings (NVIDIA NIM): one row; the key never leaves through the settings read ----

create table public.ai_settings (
  id         boolean primary key default true check (id),
  api_key    text,
  model      text not null default 'meta/llama-3.3-70b-instruct',
  reasoning  boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.ai_settings enable row level security; -- no policies: RPCs only
insert into public.ai_settings default values;

/** Model, reasoning and a hint of the key (its last 4 characters), for the settings form. */
create function public.admin_ai_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.ai_settings;
begin
  perform public._require_admin();
  select * into s from public.ai_settings;
  return jsonb_build_object('model', s.model, 'reasoning', s.reasoning,
    'keyHint', case when s.api_key is null then null else '…' || right(s.api_key, 4) end);
end $$;

/** p_api_key: null keeps the saved key, '' removes it. */
create function public.admin_save_ai_settings(p_model text, p_reasoning boolean, p_api_key text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_admin();
  if coalesce(trim(p_model), '') = '' then raise exception 'model is required' using errcode = '22023'; end if;
  update public.ai_settings
     set model = trim(p_model), reasoning = coalesce(p_reasoning, false),
         api_key = case when p_api_key is null then api_key else nullif(trim(p_api_key), '') end,
         updated_at = now();
  return public.admin_ai_settings();
end $$;

/** The full settings, key included: read by the /api/admin/generate route on the admin's behalf. */
create function public.admin_ai_credentials() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.ai_settings;
begin
  perform public._require_admin();
  select * into s from public.ai_settings;
  return jsonb_build_object('apiKey', s.api_key, 'model', s.model, 'reasoning', s.reasoning);
end $$;

-- ---- words ----

/** Adds words, or updates the IPA of ones already there (same text and part of speech). */
create function public.admin_save_words(p_words jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public._require_admin();
  if exists (select 1 from jsonb_array_elements(p_words) w
              where coalesce(w ->> 'text', '') !~ '^[A-Za-z'']{1,40}$' or coalesce(trim(w ->> 'ipa'), '') = '') then
    raise exception 'each word needs letters only and an IPA' using errcode = '22023';
  end if;
  insert into public.words (text, ipa, pos)
  select w ->> 'text', trim(w ->> 'ipa'), w ->> 'pos' from jsonb_array_elements(p_words) w
  on conflict (text, pos) do update set ipa = excluded.ipa;
  get diagnostics n = row_count;
  return n;
end $$;

create function public.admin_update_word(p_id bigint, p_ipa text, p_pos text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_admin();
  if coalesce(trim(p_ipa), '') = '' then raise exception 'IPA is required' using errcode = '22023'; end if;
  update public.words set ipa = trim(p_ipa), pos = p_pos where id = p_id;
end $$;

/** Only a word no phrase uses can go. */
create function public.admin_delete_word(p_id bigint) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_admin();
  if exists (select 1 from public.phrase_words where word_id = p_id) then return false; end if;
  delete from public.words where id = p_id;
  return true;
end $$;

-- ---- phrases ----

/**
 * Saves phrases: [{ text, translation, planet, words: [{ text, pos }] }]. Every word must already
 * exist (admin_save_words first). A phrase with the same text is updated and relinked. Level, kind
 * and audio path follow scripts/generate-seed.mjs. Returns { inserted, updated }.
 */
create function public.admin_save_phrases(p_phrases jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  v_text text;
  n int;
  linked int;
  v_id bigint;
  v_new boolean;
  inserted int := 0;
  updated int := 0;
begin
  perform public._require_admin();
  for item in select * from jsonb_array_elements(p_phrases) loop
    v_text := item ->> 'text';
    n := coalesce(jsonb_array_length(item -> 'words'), 0);
    if n not between 1 and 12 then raise exception 'bad word count in "%"', v_text using errcode = '22023'; end if;
    if v_text is distinct from (select string_agg(x ->> 'text', ' ' order by o) from jsonb_array_elements(item -> 'words') with ordinality e(x, o)) then
      raise exception 'text and words differ in "%"', v_text using errcode = '22023';
    end if;
    if coalesce(trim(item ->> 'translation'), '') = '' then raise exception 'missing translation for "%"', v_text using errcode = '22023'; end if;

    insert into public.phrases (text, translation, level, kind, sort_order, audio_path, planet)
    values (
      v_text, trim(item ->> 'translation'),
      case when n <= 3 then 1 when n = 4 then 2 else 3 end,
      case when n = 1 then 'word' when n <= 3 then 'phrase' else 'sentence' end,
      (select coalesce(max(sort_order), 0) + 1 from public.phrases),
      '/audio/' || trim(both '-' from regexp_replace(lower(v_text), '[^a-z0-9]+', '-', 'g')) || '.mp3',
      item ->> 'planet')
    on conflict (text) do update set translation = excluded.translation, planet = excluded.planet
    returning id, (xmax = 0) into v_id, v_new;

    delete from public.phrase_words where phrase_id = v_id;
    insert into public.phrase_words (phrase_id, word_index, word_id)
    select v_id, (o - 1)::smallint, w.id
      from jsonb_array_elements(item -> 'words') with ordinality e(x, o)
      join public.words w on w.text = x ->> 'text' and w.pos = x ->> 'pos';
    get diagnostics linked = row_count;
    if linked <> n then raise exception 'unknown word in "%"', v_text using errcode = '22023'; end if;

    if v_new then inserted := inserted + 1; else updated := updated + 1; end if;
  end loop;
  return jsonb_build_object('inserted', inserted, 'updated', updated);
end $$;

create function public.admin_delete_phrase(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_admin();
  delete from public.phrases where id = p_id;
end $$;

revoke all on function
  public.is_admin(), public._require_admin(), public.admin_ai_settings(), public.admin_save_ai_settings(text, boolean, text),
  public.admin_ai_credentials(), public.admin_save_words(jsonb), public.admin_update_word(bigint, text, text),
  public.admin_delete_word(bigint), public.admin_save_phrases(jsonb), public.admin_delete_phrase(bigint)
from public, anon, authenticated;

grant execute on function
  public.is_admin(), public.admin_ai_settings(), public.admin_save_ai_settings(text, boolean, text),
  public.admin_ai_credentials(), public.admin_save_words(jsonb), public.admin_update_word(bigint, text, text),
  public.admin_delete_word(bigint), public.admin_save_phrases(jsonb), public.admin_delete_phrase(bigint)
to authenticated;
