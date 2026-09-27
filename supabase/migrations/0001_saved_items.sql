-- Words and phrase chunks the learner clicked to study later.
-- Users are anonymous Supabase auth users (enable "Anonymous sign-ins" in Auth settings).

create table public.saved_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('word', 'chunk')),
  text        text not null check (char_length(text) between 1 and 200),
  sentence    text not null check (char_length(sentence) between 1 and 400),
  translation text,
  start_idx   int  not null check (start_idx >= 0),
  end_idx     int  not null check (end_idx >= start_idx),
  created_at  timestamptz not null default now(),
  unique (user_id, text)
);

create index saved_items_user_created_idx on public.saved_items (user_id, created_at desc);

alter table public.saved_items enable row level security;

create policy "saved_items: read own"
  on public.saved_items for select
  using (user_id = (select auth.uid()));

create policy "saved_items: insert own"
  on public.saved_items for insert
  with check (user_id = (select auth.uid()));

create policy "saved_items: delete own"
  on public.saved_items for delete
  using (user_id = (select auth.uid()));
