-- Oxygen Extra and Streak Shield were too cheap for what they save: Oxygen goes 40 → 400 coins and
-- the Shield 80 → 1600 (OXYGEN_COST and FREEZE_COST in src/lib/shop.ts). Items already bought stay.
update public.shop_items set coins = 400 where kind = 'oxygen' and item_id = 'oxygen';
update public.shop_items set coins = 1600 where kind = 'freeze' and item_id = 'freeze';
