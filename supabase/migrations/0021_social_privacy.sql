-- Social layer, part 1: friendships, blocks and profile privacy. Nothing about one learner is
-- readable by another through the tables: profiles, player_stats and the rest keep their "read own"
-- policies, friendships and blocks have none at all, and whatever another learner may see is
-- served by security definer RPCs that apply the privacy settings and blocks below.

-- ---------------------------------------------------------------------------------------------
-- Friendships: one row per pair, ordered so (A, B) and (B, A) are the same key. That rules out a
-- duplicate pair and two crossed requests at once.

create table public.friendships (
  user_low     uuid not null references auth.users (id) on delete cascade,
  user_high    uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high)),
  check ((status = 'accepted') = (accepted_at is not null))
);

create index friendships_high on public.friendships (user_high);

create table public.blocks (
  blocker    uuid not null references auth.users (id) on delete cascade,
  blocked    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create index blocks_blocked on public.blocks (blocked);

-- No policies: clients reach these only through the RPCs.
alter table public.friendships enable row level security;
alter table public.blocks      enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Privacy and public fields on the profile.
--   visibility      who can open the profile: anyone, accepted friends, or no one
--   show_full_name  others see the full name, not only @username
--   show_activity   others see the streak and when the learner last studied
--   allow_requests  whether anyone can send a friend request
--   bio             a short line about the learner
--   friend_code     8 characters to share for adding a friend; regenerable, which retires the old one

-- Letters and digits a person can read back without mixing them up: no 0/O, 1/I/L.
create function public._new_friend_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  b bytea;
  i int;
begin
  loop
    -- The fully random bytes of a v4 uuid (6 and 8 carry the version and variant bits).
    b := uuid_send(gen_random_uuid());
    code := '';
    foreach i in array array[0, 1, 2, 3, 4, 5, 9, 10] loop
      code := code || substr(alphabet, get_byte(b, i) % length(alphabet) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end $$;

alter table public.profiles
  add column visibility     text    not null default 'friends' check (visibility in ('public','friends','private')),
  add column show_full_name boolean not null default false,
  add column show_activity  boolean not null default true,
  add column allow_requests text    not null default 'everyone' check (allow_requests in ('everyone','nobody')),
  add column bio            text    check (char_length(bio) between 1 and 140),
  add column friend_code    text    check (friend_code ~ '^[A-HJKMNP-Z2-9]{8}$');

do $$
declare r record;
begin
  for r in select user_id from public.profiles loop
    update public.profiles set friend_code = public._new_friend_code() where user_id = r.user_id;
  end loop;
end $$;

alter table public.profiles alter column friend_code set not null;
alter table public.profiles add constraint profiles_friend_code_key unique (friend_code);

create function public._profile_friend_code() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.friend_code := public._new_friend_code();
  return new;
end $$;

create trigger profiles_friend_code
  before insert on public.profiles
  for each row execute function public._profile_friend_code();

-- The client may still keep its own time zone current (syncTimeZone); every other column of the
-- profile is written through the RPCs below.
revoke update on public.profiles from anon, authenticated;
grant update (time_zone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Helpers for the social RPCs (internal: not callable by clients)

-- A block works both ways: if either blocked the other, neither finds the other anywhere.
create function public._blocked(a uuid, b uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.blocks
                 where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;

create function public._are_friends(a uuid, b uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.friendships
                 where user_low = least(a, b) and user_high = greatest(a, b) and status = 'accepted');
$$;

-- Whether `viewer` may open `target`'s profile under its visibility setting and blocks.
create function public._can_view_profile(viewer uuid, target uuid) returns boolean
language sql stable set search_path = '' as $$
  select viewer = target or (
    not public._blocked(viewer, target)
    and coalesce((select case visibility
                           when 'public'  then true
                           when 'friends' then public._are_friends(viewer, target)
                           else false
                         end
                  from public.profiles where user_id = target), false));
$$;

-- ---------------------------------------------------------------------------------------------
-- RPCs

create function public._profile_settings(uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'visibility', visibility, 'showFullName', show_full_name, 'showActivity', show_activity,
    'allowRequests', allow_requests, 'bio', bio, 'friendCode', friend_code)
  from public.profiles where user_id = uid;
$$;

-- Saves the privacy settings and bio. It sets absolute values, so repeating it is harmless and it
-- needs no idempotency key. A blank bio clears it.
create function public.update_profile_settings(
  p_visibility     text,
  p_show_full_name boolean,
  p_show_activity  boolean,
  p_allow_requests text,
  p_bio            text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  v_bio text := nullif(btrim(regexp_replace(coalesce(p_bio, ''), '\s+', ' ', 'g')), '');
begin
  if p_visibility is null or p_visibility not in ('public','friends','private') then
    raise exception 'bad visibility' using errcode = '22023';
  end if;
  if p_allow_requests is null or p_allow_requests not in ('everyone','nobody') then
    raise exception 'bad allow_requests' using errcode = '22023';
  end if;
  if p_show_full_name is null or p_show_activity is null then
    raise exception 'bad settings' using errcode = '22023';
  end if;
  if char_length(v_bio) > 140 then raise exception 'bio too long' using errcode = '22023'; end if;

  update public.profiles
     set visibility = p_visibility, show_full_name = p_show_full_name, show_activity = p_show_activity,
         allow_requests = p_allow_requests, bio = v_bio
   where user_id = uid;
  if not found then raise exception 'no profile' using errcode = 'P0002'; end if;
  return public._profile_settings(uid);
end $$;

-- A new friend code; the old one stops working. Keyed by an event id, so a retried call returns
-- the code the first one made instead of rolling a second.
create function public.regenerate_friend_code(p_event_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_uid();
  saved jsonb;
begin
  saved := public._event_begin(uid, p_event_id, 'regenerate_friend_code', '{}');
  if saved is not null then return saved; end if;
  update public.profiles set friend_code = public._new_friend_code() where user_id = uid;
  if not found then raise exception 'no profile' using errcode = 'P0002'; end if;
  return public._event_end(uid, p_event_id, public._profile_settings(uid));
end $$;

revoke all on function public._new_friend_code() from public, anon, authenticated;
revoke all on function public._profile_friend_code() from public, anon, authenticated;
revoke all on function public._blocked(uuid, uuid) from public, anon, authenticated;
revoke all on function public._are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public._can_view_profile(uuid, uuid) from public, anon, authenticated;
revoke all on function public._profile_settings(uuid) from public, anon, authenticated;
revoke all on function public.update_profile_settings(text, boolean, boolean, text, text) from public, anon, authenticated;
revoke all on function public.regenerate_friend_code(uuid) from public, anon, authenticated;
grant execute on function public.update_profile_settings(text, boolean, boolean, text, text) to authenticated;
grant execute on function public.regenerate_friend_code(uuid) to authenticated;
