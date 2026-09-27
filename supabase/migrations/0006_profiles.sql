-- Public profile data captured at sign-up: full name and a unique username.

create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  full_name  text not null check (char_length(full_name) between 2 and 80),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select using (user_id = (select auth.uid()));
create policy "profiles: update own"
  on public.profiles for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The profile is created from the sign-up metadata, so it also works when email
-- confirmation is on (no session exists yet at that point).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (user_id, username, full_name)
    values (new.id, lower(new.raw_user_meta_data ->> 'username'), new.raw_user_meta_data ->> 'full_name');
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form check a username without exposing the profiles table.
create function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
