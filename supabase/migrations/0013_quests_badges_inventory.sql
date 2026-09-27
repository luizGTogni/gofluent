-- Missions, badges and store items, previously kept per device in localStorage.

-- One row per quest per period ('YYYY-MM-DD' for daily, the week's Monday for weekly). `claimed`
-- only ever flips false -> true, and the reward is paid only by the update that flips it, so a
-- quest pays out at most once per (user, quest, period) no matter how many devices report it.
create table public.quest_progress (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quest_id   text not null,
  period_key text not null,
  count      int  not null default 0 check (count >= 0),
  claimed    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id, period_key)
);

create table public.badges (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  badge_id    text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Oxygen tanks, owned spacesuit pieces, and the lifetime no-hint counter a badge watches.
create table public.inventory (
  user_id       uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  oxygen        int    not null default 0 check (oxygen >= 0),
  suits         text[] not null default '{}',
  no_hint_count int    not null default 0 check (no_hint_count >= 0),
  updated_at    timestamptz not null default now()
);

alter table public.quest_progress enable row level security;
alter table public.badges         enable row level security;
alter table public.inventory      enable row level security;

create policy "quest_progress: read own"   on public.quest_progress for select using (user_id = (select auth.uid()));
create policy "quest_progress: insert own" on public.quest_progress for insert with check (user_id = (select auth.uid()));
create policy "quest_progress: update own" on public.quest_progress for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "badges: read own"   on public.badges for select using (user_id = (select auth.uid()));
create policy "badges: insert own" on public.badges for insert with check (user_id = (select auth.uid()));

create policy "inventory: read own"   on public.inventory for select using (user_id = (select auth.uid()));
create policy "inventory: insert own" on public.inventory for insert with check (user_id = (select auth.uid()));
create policy "inventory: update own" on public.inventory for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Once claimed, a quest stays claimed: a stale client can't reopen it and be paid again.
create function public.quest_claim_is_final() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.claimed and not new.claimed then new.claimed := true; end if;
  new.updated_at := now();
  return new;
end $$;

create trigger quest_claim_is_final
  before update on public.quest_progress
  for each row execute function public.quest_claim_is_final();
