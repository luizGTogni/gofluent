-- Study calendar (for streaks and the GitHub-style heatmap), and the economy: Lunar Coins,
-- Crystals, streak freezes, and which days were bridged by a freeze.

create table public.study_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day     date not null,
  seconds int  not null default 0 check (seconds >= 0),
  primary key (user_id, day)
);

create table public.freeze_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);

create table public.wallet (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  coins            bigint not null default 0 check (coins >= 0),
  crystals         bigint not null default 0 check (crystals >= 0),
  freezes          int    not null default 0 check (freezes >= 0),
  last_interest_day date,
  updated_at       timestamptz not null default now()
);

alter table public.study_days  enable row level security;
alter table public.freeze_days enable row level security;
alter table public.wallet      enable row level security;

create policy "study_days: read own"   on public.study_days  for select using (user_id = (select auth.uid()));
create policy "study_days: insert own" on public.study_days  for insert with check (user_id = (select auth.uid()));
create policy "study_days: update own" on public.study_days  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "freeze_days: read own"   on public.freeze_days for select using (user_id = (select auth.uid()));
create policy "freeze_days: insert own" on public.freeze_days for insert with check (user_id = (select auth.uid()));

create policy "wallet: read own"   on public.wallet for select using (user_id = (select auth.uid()));
create policy "wallet: insert own" on public.wallet for insert with check (user_id = (select auth.uid()));
create policy "wallet: update own" on public.wallet for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
