-- BandUp — starter quest seeds
-- Quests covering all 4 skills (reading, listening, writing, speaking) + "any",
-- across all three period types: daily, weekly, monthly.
--
-- quest_type controls how long a quest stays active once assigned:
--   'daily'   → one calendar day
--   'weekly'  → the calendar week (Mon–Sun)
--   'monthly' → the calendar month
--
-- HOW TO RUN
-- ──────────
-- Local dev (Miniflare):
--   wrangler d1 execute bandup-db --local --file=src/db/seeds/quests.sql
--
-- Production:
--   wrangler d1 execute bandup-db --file=src/db/seeds/quests.sql
--
-- Safe to re-run — INSERT OR IGNORE skips rows whose (title_mn) already exist.
-- If you need a full reset first: DELETE FROM quests; then re-run.

-- ════════════════════════════════════════════════════════════════════════════
-- DAILY quests
-- ════════════════════════════════════════════════════════════════════════════

-- ── Reading ────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг уншилт хий',
    'Өнөөдөр нэг уншилтын дасгал амжилттай дуусга.',
    'reading', 'daily', 1, 50, 10, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '3 уншилт хий',
    'Өнөөдөр гурван уншилтын дасгал дуусга.',
    'reading', 'daily', 3, 150, 30, 1
  );

-- ── Listening ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг сонсолт хий',
    'Өнөөдөр нэг сонсолтын дасгал амжилттай дуусга.',
    'listening', 'daily', 1, 50, 10, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '3 сонсолт хий',
    'Өнөөдөр гурван сонсолтын дасгал дуусга.',
    'listening', 'daily', 3, 150, 30, 1
  );

-- ── Writing ───────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг бичлэг хий',
    'Өнөөдөр нэг бичлэгийн дасгал амжилттай дуусга.',
    'writing', 'daily', 1, 60, 12, 1
  );

-- ── Speaking ──────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг ярилт хий',
    'Өнөөдөр нэг ярилтын дасгал амжилттай дуусга.',
    'speaking', 'daily', 1, 60, 12, 1
  );

-- ── Any skill ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Эхний алхам',
    'Аль ч ур чадварын нэг дасгал дуусга.',
    'any', 'daily', 1, 30, 5, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Гурван дасгал',
    'Аль ч ур чадварын гурван дасгал дуусга.',
    'any', 'daily', 3, 80, 15, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Тав дасгал',
    'Аль ч ур чадварын таван дасгал дуусга.',
    'any', 'daily', 5, 200, 40, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Идэвхтэй өдөр',
    'Өнөөдөр аль ч ур чадварын хоёр дасгал дуусга.',
    'any', 'daily', 2, 60, 12, 1
  );

-- ════════════════════════════════════════════════════════════════════════════
-- WEEKLY quests (active for the whole Mon–Sun week)
-- ════════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '7 хоногт 10 дасгал',
    'Энэ долоо хоногт аль ч ур чадварын арван дасгал дуусга.',
    'any', 'weekly', 10, 500, 100, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '7 хоногт 5 уншилт',
    'Энэ долоо хоногт таван уншилтын дасгал дуусга.',
    'reading', 'weekly', 5, 300, 60, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '7 хоногт 5 сонсолт',
    'Энэ долоо хоногт таван сонсолтын дасгал дуусга.',
    'listening', 'weekly', 5, 300, 60, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '7 хоногт 3 бичлэг',
    'Энэ долоо хоногт гурван бичлэгийн дасгал дуусга.',
    'writing', 'weekly', 3, 250, 50, 1
  );

-- ════════════════════════════════════════════════════════════════════════════
-- MONTHLY quests (active for the whole calendar month)
-- ════════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Сарын 40 дасгал',
    'Энэ сард аль ч ур чадварын дөчин дасгал дуусга.',
    'any', 'monthly', 40, 2000, 400, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, quest_type, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Сарын төгс уншигч',
    'Энэ сард хорин уншилтын дасгал дуусга.',
    'reading', 'monthly', 20, 1200, 240, 1
  );
