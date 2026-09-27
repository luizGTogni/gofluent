-- Planets: each phrase belongs to a planet (a themed track with a CEFR band), plus per-player planet stats.

-- New parts of speech used by the planet content.
alter table public.words drop constraint words_pos_check;
alter table public.words add constraint words_pos_check
  check (pos in ('noun','verb','numeral','pronoun','adjective','adverb','article','determiner','preposition','conjunction','interjection'));

alter table public.phrases add column planet text not null default 'earth'
  check (planet in ('earth','moon','mars','venus','jupiter','saturn','uranus','neptune','nebula','galaxy'));
create index phrases_planet_idx on public.phrases (planet, level, sort_order);

-- played: phrases finished on this planet. solid: finished with no help and at most one slip.
-- entered_at: the first visit, which is what the rank requirement gates. Visited planets stay open.
create table public.planet_stats (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  planet     text not null check (planet in ('earth','moon','mars','venus','jupiter','saturn','uranus','neptune','nebula','galaxy')),
  played     int not null default 0 check (played >= 0),
  solid      int not null default 0 check (solid >= 0 and solid <= played),
  entered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, planet)
);

alter table public.planet_stats enable row level security;

create policy "planet_stats: read own"
  on public.planet_stats for select using (user_id = (select auth.uid()));
create policy "planet_stats: insert own"
  on public.planet_stats for insert with check (user_id = (select auth.uid()));
create policy "planet_stats: update own"
  on public.planet_stats for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
