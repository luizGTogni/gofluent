-- XP and rank points per player. Lifetime XP never decreases; rank points can fade with inactivity
-- (the fade is computed when reading, so these columns only change when the player earns XP).
create table public.player_stats (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  xp             bigint not null default 0 check (xp >= 0),
  rp             bigint not null default 0 check (rp >= 0),
  last_active_at timestamptz,
  updated_at     timestamptz not null default now(),
  check (rp <= xp)
);

alter table public.player_stats enable row level security;

create policy "player_stats: read own"
  on public.player_stats for select using (user_id = (select auth.uid()));
create policy "player_stats: insert own"
  on public.player_stats for insert with check (user_id = (select auth.uid()));
create policy "player_stats: update own"
  on public.player_stats for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
