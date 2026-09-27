-- Generation falls back through a list of NIM models instead of one: tried in order, skipping any
-- that failed in the last few minutes (model_failures: model → when it last failed), so a model
-- that is down or rate-limited doesn't cost every request a timeout. See src/lib/nim.ts.
-- Updates name the row (where id): Supabase's API refuses an UPDATE without a WHERE clause
-- (pg-safeupdate), which is what broke saving the settings from 0025.

alter table public.ai_settings
  add column models text[] not null
    default array['google/gemma-4-31b-it', 'mistralai/mistral-nemotron', 'mistralai/mistral-large-2-instruct', 'nvidia/nemotron-3-super-120b-a12b']
    check (cardinality(models) between 1 and 4),
  add column model_failures jsonb not null default '{}';
alter table public.ai_settings drop column model;

drop function public.admin_save_ai_settings(text, boolean, text);

create or replace function public.admin_ai_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.ai_settings;
begin
  perform public._require_admin();
  select * into s from public.ai_settings;
  return jsonb_build_object('models', to_jsonb(s.models), 'reasoning', s.reasoning, 'failures', s.model_failures,
    'keyHint', case when s.api_key is null then null else '…' || right(s.api_key, 4) end);
end $$;

/** p_models: primary first, then up to 3 fallbacks. p_api_key: null keeps the saved key, '' removes it. */
create function public.admin_save_ai_settings(p_models text[], p_reasoning boolean, p_api_key text default null) returns jsonb
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
         updated_at = now()
   where id;
  return public.admin_ai_settings();
end $$;

create or replace function public.admin_ai_credentials() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.ai_settings;
begin
  perform public._require_admin();
  select * into s from public.ai_settings;
  return jsonb_build_object('apiKey', s.api_key, 'models', to_jsonb(s.models), 'reasoning', s.reasoning, 'failures', s.model_failures);
end $$;

/** After a request: models that failed get a fresh timestamp, ones that answered are cleared. */
create function public.admin_model_health(p_failed text[], p_ok text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_admin();
  update public.ai_settings
     set model_failures = (model_failures - coalesce(p_ok, '{}'))
       || coalesce((select jsonb_object_agg(m, now()) from unnest(p_failed) m), '{}')
   where id;
end $$;

revoke all on function public.admin_save_ai_settings(text[], boolean, text), public.admin_model_health(text[], text[]) from public, anon, authenticated;
grant execute on function public.admin_save_ai_settings(text[], boolean, text), public.admin_model_health(text[], text[]) to authenticated;
