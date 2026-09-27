-- Adds the "determiner" part of speech (my, some, this, ...).
alter table public.words drop constraint words_pos_check;
alter table public.words add constraint words_pos_check
  check (pos in ('noun','verb','numeral','pronoun','adjective','adverb','article','determiner','preposition'));
