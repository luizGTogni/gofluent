-- Per-word struggle tracking: how often each word appeared and how often the learner stumbled on it.
create table public.word_stats (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word       text not null check (char_length(word) between 1 and 40),
  seen       int not null default 0 check (seen >= 0),
  struggled  int not null default 0 check (struggled >= 0),
  fails      int not null default 0 check (fails >= 0),
  listening  int not null default 0 check (listening >= 0), -- times it seemed hard to hear (blank or very different)
  spelling   int not null default 0 check (spelling >= 0),  -- times it was heard but misspelled
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

alter table public.word_stats enable row level security;

create policy "word_stats: read own"
  on public.word_stats for select using (user_id = (select auth.uid()));
create policy "word_stats: insert own"
  on public.word_stats for insert with check (user_id = (select auth.uid()));
create policy "word_stats: update own"
  on public.word_stats for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "word_stats: delete own"
  on public.word_stats for delete using (user_id = (select auth.uid()));
