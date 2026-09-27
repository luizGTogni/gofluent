-- Personal best session score per game mode. The per-phrase score is no longer shown while
-- playing (XP is the progress signal); it survives as a record, shown on the end screen.
create table public.personal_bests (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode       text not null,
  score      int  not null check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

alter table public.personal_bests enable row level security;

create policy "personal_bests: read own"   on public.personal_bests for select using (user_id = (select auth.uid()));
create policy "personal_bests: insert own" on public.personal_bests for insert with check (user_id = (select auth.uid()));
create policy "personal_bests: update own" on public.personal_bests for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A best only ever rises: a stale client can't overwrite it with a lower score.
create function public.personal_best_only_rises() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.score := greatest(new.score, old.score);
  new.updated_at := now();
  return new;
end $$;

create trigger personal_best_only_rises
  before update on public.personal_bests
  for each row execute function public.personal_best_only_rises();
