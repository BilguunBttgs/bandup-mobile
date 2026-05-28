-- Shop items seed — safe to re-run (INSERT OR IGNORE)
-- Run locally:  wrangler d1 execute bandup-db --local --file=src/db/seeds/shop_items.sql
-- Run in prod:  wrangler d1 execute bandup-db --file=src/db/seeds/shop_items.sql

INSERT OR IGNORE INTO shop_items (id, name_mn, description_mn, type, effect_key, price_coin, icon_key, is_available) VALUES
  -- Boosters
  (1, 'XP 2x Дэмжлэг', '24 цагийн турш XP 2 дахин нэмэгдэнэ', 'booster', 'xp_multiplier_2x', 100, 'booster_xp_2x', 1),
  (2, 'Streak Shield', 'Нэг өдрийн streak-ийг хамгаална', 'booster', 'streak_shield', 150, 'booster_streak_shield', 1),

  -- Character skins
  (3, 'Баатар арьс', 'Уншлагын баатрын тусгай дизайн', 'cosmetic_character', NULL, 200, 'skin_reading_hero', 1),
  (4, 'Харанхуй арьс', 'Уншлагын баатрын харанхуй дизайн', 'cosmetic_character', NULL, 200, 'skin_reading_dark', 1),
  (5, 'Мэлмэр арьс', 'Сонсолтын баатрын тусгай дизайн', 'cosmetic_character', NULL, 200, 'skin_listening_wave', 1),
  (6, 'Алтан арьс', 'Сонсолтын баатрын алтан дизайн', 'cosmetic_character', NULL, 250, 'skin_listening_gold', 1);
