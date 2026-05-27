-- BandUp — starter quest seeds
-- 10 quests covering all 4 skills (reading, listening, writing, speaking) + "any".
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

-- ── Reading ────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг уншилт хий',
    'Өнөөдөр нэг уншилтын дасгал амжилттай дуусга.',
    'reading', 1, 50, 10, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '3 уншилт хий',
    'Өнөөдөр гурван уншилтын дасгал дуусга.',
    'reading', 3, 150, 30, 1
  );

-- ── Listening ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг сонсолт хий',
    'Өнөөдөр нэг сонсолтын дасгал амжилттай дуусга.',
    'listening', 1, 50, 10, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    '3 сонсолт хий',
    'Өнөөдөр гурван сонсолтын дасгал дуусга.',
    'listening', 3, 150, 30, 1
  );

-- ── Writing ───────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг бичлэг хий',
    'Өнөөдөр нэг бичлэгийн дасгал амжилттай дуусга.',
    'writing', 1, 60, 12, 1
  );

-- ── Speaking ──────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Нэг ярилт хий',
    'Өнөөдөр нэг ярилтын дасгал амжилттай дуусга.',
    'speaking', 1, 60, 12, 1
  );

-- ── Any skill ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Эхний алхам',
    'Аль ч ур чадварын нэг дасгал дуусга.',
    'any', 1, 30, 5, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Гурван дасгал',
    'Аль ч ур чадварын гурван дасгал дуусга.',
    'any', 3, 80, 15, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Тав дасгал',
    'Аль ч ур чадварын таван дасгал дуусга.',
    'any', 5, 200, 40, 1
  );

INSERT OR IGNORE INTO quests
  (title_mn, description_mn, skill_target, required_count, xp_reward, coin_reward, is_active)
VALUES
  (
    'Арван дасгал',
    'Аль ч ур чадварын арван дасгал дуусга.',
    'any', 10, 500, 100, 1
  );
