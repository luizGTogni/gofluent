-- Spaced-repetition state: one row per (user, phrase), Leitner boxes.
create table public.review_state (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  phrase     text not null check (char_length(phrase) between 1 and 400),
  box        smallint not null default 0 check (box between 0 and 5),
  due_at     timestamptz not null,
  reps       int not null default 0,
  lapses     int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, phrase)
);

create index review_state_due_idx on public.review_state (user_id, due_at);

alter table public.review_state enable row level security;

create policy "review_state: read own"
  on public.review_state for select using (user_id = (select auth.uid()));
create policy "review_state: insert own"
  on public.review_state for insert with check (user_id = (select auth.uid()));
create policy "review_state: update own"
  on public.review_state for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "review_state: delete own"
  on public.review_state for delete using (user_id = (select auth.uid()));
