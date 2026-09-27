-- Learning content: words (dictionary), phrases, and which words make up each phrase.
-- Public read-only: the app reads it with the anon key; writes happen only via SQL/seed.

create table public.words (
  id   bigint generated always as identity primary key,
  text text not null check (char_length(text) between 1 and 40),
  ipa  text not null,
  pos  text not null check (pos in ('noun','verb','numeral','pronoun','adjective','adverb','article','preposition')),
  unique (text, pos)
);

create table public.phrases (
  id          bigint generated always as identity primary key,
  text        text not null unique check (char_length(text) between 1 and 400),
  translation text not null,
  level       smallint not null check (level between 1 and 5),
  kind        text not null check (kind in ('word','phrase','sentence')),
  sort_order  int not null default 0,
  audio_path  text not null
);

create table public.phrase_words (
  phrase_id bigint not null references public.phrases (id) on delete cascade,
  word_index smallint not null check (word_index >= 0),
  word_id   bigint not null references public.words (id),
  primary key (phrase_id, word_index)
);

create index phrases_level_sort_idx on public.phrases (level, sort_order);
create index phrase_words_word_idx on public.phrase_words (word_id);

alter table public.words        enable row level security;
alter table public.phrases      enable row level security;
alter table public.phrase_words enable row level security;

create policy "words: public read"        on public.words        for select to anon, authenticated using (true);
create policy "phrases: public read"      on public.phrases      for select to anon, authenticated using (true);
create policy "phrase_words: public read" on public.phrase_words for select to anon, authenticated using (true);
