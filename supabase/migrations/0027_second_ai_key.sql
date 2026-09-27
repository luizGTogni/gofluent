-- A second NVIDIA NIM key for fallback: NIM's rate limit is per key, so when the first key is
-- rate-limited or refused the same model is retried with the second before moving down the chain.
-- Like the first, it never leaves through the settings read, only its last 4 characters.

alter table public.ai_settings add column api_key_2 text;

create or replace function public.admin_ai_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.ai_settings;
begin
  perform public._require_admin();
  select * into s from public.ai_settings;
  return jsonb_build_object('models', to_jsonb(s.models), 'reasoning', s.reasoning, 'failures', s.model_failures,
    'keyHint', case when s.api_key is null then null else '…' || right(s.api_key, 4) end,
    'keyHint2', case when s.api_key_2 is null then null else '…' || right(s.api_key_2, 4) end);
end $$;

drop function public.admin_save_ai_settings(text[], boolean, text);

/** p_models: primary first, then up to 3 fallbacks. Each key: null keeps the saved one, '' removes it. */
create function public.admin_save_ai_settings(p_models text[], p_reasoning boolean, p_api_key text default null, p_api_key_2 text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cleaned text[];
begin
  perform public._require_admin();
  select coalesce(array_agg(m order by o), '{}') into cleaned
    from (select distinct on (trim(m)) trim(m) m, o from unnest(p_models) with ordinality u(m, o) where trim(coalesce(m, '')) <> '' order by trim(m), o) x;
  if cardinality(cleaned) not between 1 and 4 then raise exception 'pick 1 to 4 models' using errcode = '22023'; end if;
  update public.ai_settings
     set models = cleaned, reasoning = coalesce(p_reasoning, false),
         api_key = case when p_api_key is null then api_key else nullif(trim(p_api_key), '') end,
         api_key_2 = case when p_api_key_2 is null then api_key_2 else nullif(trim(p_api_key_2), '') end,
         updated_at = now()
   where id;
  return public.admin_ai_settings();
end $$;

/** Both keys, in the order to try them (empty ones left out). */
create or replace function public.admin_ai_credentials() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.ai_settings;
begin
  perform public._require_admin();
  select * into s from public.ai_settings;
  return jsonb_build_object(
    'apiKeys', to_jsonb(array_remove(array[s.api_key, s.api_key_2], null)),
    'models', to_jsonb(s.models), 'reasoning', s.reasoning, 'failures', s.model_failures);
end $$;

revoke all on function public.admin_save_ai_settings(text[], boolean, text, text) from public, anon, authenticated;
grant execute on function public.admin_save_ai_settings(text[], boolean, text, text) to authenticated;
