-- Journey cosmetics bought with Crystals: owned ids, and the one worn per kind (null = default look).
alter table public.inventory
  add column cosmetics text[] not null default '{}',
  add column trail     text,
  add column halo      text;
