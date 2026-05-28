# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**BandUp** is a mobile app backend for IELTS learners. Users sign up, complete onboarding, then take reading exercises (passages + MCQ / True-False-Not-Given questions). The server scores answers, converts results to IELTS band scores, and tracks each user's personal best. A gamification layer adds per-skill characters (HP/XP/level), a coin economy, daily quests, and a cosmetics shop. The backend runs entirely on **Cloudflare Workers** — no Node.js, no traditional server.

---

## Commands

```bash
bun install                        # Install dependencies
bun run dev                        # Start local dev server (Vite + Miniflare)
bun run build                      # Build for production
bun run deploy                     # Build and deploy to Cloudflare Workers
bun run cf-typegen                 # Regenerate CloudflareBindings types from wrangler config

# Database (Drizzle ORM + Cloudflare D1)
bun run db:generate                # Generate SQL migration files from schema changes
bun run db:migrate:local           # Apply migrations to local D1 (dev)
bun run db:migrate:remote          # Apply migrations to production D1
```

> **DB workflow**: edit a file in `src/db/schema/` → `db:generate` → `db:migrate:local` (test) → `db:migrate:remote` (prod).

---

## Architecture

**Runtime**: Cloudflare Workers (via `wrangler`/`workerd`) — Web Crypto API only, no Node.js built-ins.

| Layer | Technology | Notes |
|---|---|---|
| Framework | [Hono](https://hono.dev/) | Lightweight, edge-first; typed via `CloudflareBindings` |
| Database | Cloudflare D1 (SQLite) | Binding name: `DB`; accessed via `c.env.DB` |
| ORM | Drizzle ORM | Schema split across `src/db/schema/`; migrations in `drizzle/migrations/` |
| Validation | Zod + `@hono/zod-validator` | Schemas co-located in each controller file |
| Auth | `hono/jwt` (HS256) | Sign-in issues a 7-day JWT; `authMiddleware` verifies it on protected routes |
| Password hashing | PBKDF2 + SHA-256 | Web Crypto API; 100 k iterations, 16-byte salt; `src/lib/password.ts` |
| Band scoring | Custom table | `src/lib/band-score.ts` — percentage → IELTS 0–9 (0.5 steps) |
| Audio storage | Cloudflare R2 | Binding name: `AUDIO_BUCKET`; presigned URL helpers in `src/lib/r2-audio.ts` |
| Bundler | Vite + `@cloudflare/vite-plugin` | Replaces running wrangler directly for local dev |

### Code pattern — MVC

Each route group owns three layers:

```
src/routes/<name>.ts          — Hono sub-app: maps HTTP verbs → (middleware +) controller
src/controllers/<name>/*.ts   — One file per endpoint: exports Zod schema + handler
src/lib/                      — Shared utilities (auth, password, band score)
```

---

## File structure

```
src/
├── index.tsx                          # App entry — registers route groups + exports scheduled cron handler
├── renderer.tsx                       # JSX layout wrapper (Hono JSX, NOT React)
├── style.css                          # Global stylesheet
│
├── db/
│   ├── index.ts                       # createDb(d1) — creates a Drizzle client from a D1 binding
│   ├── seeds/
│   │   ├── quests.sql                 # 10 starter quests; run with wrangler d1 execute --file
│   │   └── shop_items.sql             # 6 starter shop items (2 boosters + 4 skins); same run pattern
│   └── schema/
│       ├── index.ts                   # Re-exports all tables + relations
│       ├── users.ts                   # users table
│       ├── readings.ts                # readings table
│       ├── questions.ts               # questions + question_options tables
│       ├── submissions.ts             # user_reading_submissions table
│       ├── listenings.ts              # listenings table (audio exercises)
│       ├── listening_questions.ts     # listening_questions + listening_question_options tables
│       ├── listening_submissions.ts   # user_listening_submissions table
│       ├── characters.ts              # characters table (per-skill RPG character)
│       ├── user_stats.ts              # user_stats table (XP, coins, streak — one row per user)
│       ├── quests.ts                  # quests (templates) + user_quests (daily progress) tables
│       ├── shop.ts                    # shop_items + user_inventory tables
│       ├── leaderboard_snapshots.ts   # leaderboard_snapshots table (weekly top-10 cron)
│       └── relations.ts               # Drizzle relation definitions (for relational queries)
│
├── routes/
│   ├── auth.ts                        # /auth/* — public (signup, signin)
│   ├── reading.ts                     # /reading/* — requires JWT
│   ├── listening.ts                   # /listening/* — requires JWT
│   ├── game.ts                        # /game/* — requires JWT (player state, checkin, revive, leaderboard)
│   ├── shop.ts                        # /shop/* — requires JWT (items, inventory, buy, equip)
│   └── admin.ts                       # /admin/* — requires X-Admin-Key header
│
├── controllers/
│   ├── auth/
│   │   ├── signup.controller.ts          # POST /auth/signup
│   │   ├── signin.controller.ts          # POST /auth/signin → issues JWT
│   │   └── onboardingStep.controller.ts  # POST /auth/onboarding/step (JWT) — 4-step onboarding flow
│   ├── reading/
│   │   ├── list.controller.ts         # GET /reading?level=
│   │   ├── get.controller.ts          # GET /reading/:id (passage + questions, NO correct answers)
│   │   └── submit.controller.ts       # POST /reading/:id/submit → scores + saves attempt
│   ├── listening/
│   │   ├── list.controller.ts         # GET /listening?level=
│   │   ├── get.controller.ts          # GET /listening/:id (questions + presigned audio URL, NO answers)
│   │   └── submit.controller.ts       # POST /listening/:id/submit → scores + gamification rewards
│   ├── game/
│   │   ├── state.controller.ts        # GET /game/state (lazy-init stats + chars; today's quests)
│   │   ├── checkin.controller.ts      # POST /game/checkin (streak + daily quest generation)
│   │   ├── revive.controller.ts       # POST /game/revive (50-coin character restore)
│   │   └── leaderboard.controller.ts  # GET /game/leaderboard (top 20 by totalXp)
│   ├── shop/
│   │   ├── listItems.controller.ts    # GET /shop/items (isAvailable=true)
│   │   ├── inventory.controller.ts    # GET /shop/inventory (user_inventory joined with shop_items)
│   │   ├── buy.controller.ts          # POST /shop/buy (spendCoins + insert inventory; 24h TTL for boosters)
│   │   └── equip.controller.ts        # POST /shop/equip (cosmetics only; unequip same-type others)
│   └── admin/
│       ├── createReading.controller.ts   # POST /admin/readings (reading + questions + options in one TX)
│       ├── listReadings.controller.ts    # GET /admin/readings
│       ├── deleteReading.controller.ts   # DELETE /admin/readings/:id
│       └── createListening.controller.ts # POST /admin/listenings (two-step upload flow)
│
└── lib/
    ├── auth-middleware.ts             # JWT Bearer verification; sets userId + username on context
    ├── band-score.ts                  # calculateBandScore(correct, total) → 0–9 IELTS band
    ├── password.ts                    # hashPassword / verifyPassword (PBKDF2, constant-time)
    ├── xp-engine.ts                   # xpToLevel, levelToXpThreshold, awardSkillXp, awardUserXp, awardCoins, spendCoins
    ├── streak-engine.ts               # recordActivity, applyMissedStreakDamage, getStreakInfo
    ├── quest-engine.ts                # generateDailyQuests, incrementQuestProgress, getTodayQuests
    └── r2-audio.ts                    # getAudioPresignUrl, getSpeakingUploadUrl, deleteAudio

drizzle/
└── migrations/                        # Auto-generated SQL migration files (commit these)

wrangler.jsonc                         # Cloudflare Workers config — name, D1 binding, migrations dir
drizzle.config.ts                      # Drizzle Kit config — schema path + migrations output dir
vite.config.ts                         # Vite config — cloudflare() + ssrPlugin()
worker-configuration.d.ts              # Auto-generated CF bindings types (run cf-typegen to refresh)
```

---

## Environment variables / bindings

| Name | Type | Purpose |
|---|---|---|
| `DB` | D1 (SQLite) | Main database |
| `AUDIO_BUCKET` | R2 | Stores listening audio files and speaking recordings |
| `JWT_SECRET` | secret text | Signs and verifies HS256 JWTs |
| `ADMIN_API_KEY` | secret text | Checked against `X-Admin-Key` header for admin routes |

> Add secrets with `wrangler secret put <NAME>` for production; put them in `.dev.vars` for local dev.

---

## Database schema

Schema is split into `src/db/schema/` — one file per table group. All tables are imported/exported through `src/db/schema/index.ts`.

### `users` (`src/db/schema/users.ts`)
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `username` | text UNIQUE | 3–30 chars, `[a-zA-Z0-9_]` |
| `email` | text UNIQUE | |
| `password` | text | PBKDF2 hash of 4-digit PIN |
| `isOnboarding` | boolean | `true` until onboarding complete; default `true` |
| `onboardingStep` | integer | Current onboarding step (0–3); default `0` |
| `targetBand` | real | Desired IELTS band set in onboarding step 0; nullable |
| `dailyGoalMinutes` | integer | Daily study goal set in onboarding step 1; default `30` |
| `readingScore` | real | Best IELTS reading band (0–9, 0.5 steps); `null` = not yet assessed |
| `listeningScore` | real | Same — not yet assessed via this server |
| `speakingScore` | real | Same |
| `writingScore` | real | Same |
| `createdAt` | timestamp | Unix epoch; DB default `unixepoch()` |

### `readings` (`src/db/schema/readings.ts`)
Reading passages with difficulty level and a suggested timer.

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `title` | text | Display title |
| `passage` | text | Full reading text |
| `level` | `"easy"│"medium"│"hard"` | easy = daily life; medium = IELTS Academic; hard = SAT-style |
| `timerSeconds` | integer | Suggested timer for clients (easy≈300, medium≈1200, hard≈1500) |
| `createdAt` | timestamp | Unix epoch |

### `questions` + `question_options` (`src/db/schema/questions.ts`)
Questions belong to a reading; options belong to a question.

**`questions`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `readingId` | integer FK → readings.id | CASCADE delete |
| `order` | integer | Display order within the reading (0-based) |
| `text` | text | Question text |
| `type` | `"multiple_choice"│"true_false_not_given"` | |
| `explanation` | text? | Why the correct answer is correct — withheld until after submission |

**`question_options`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `questionId` | integer FK → questions.id | CASCADE delete |
| `label` | text | `"A"/"B"/"C"/"D"` or `"True"/"False"/"Not Given"` |
| `text` | text | Option text |
| `isCorrect` | boolean | **NEVER returned to the client in GET routes** — only used server-side during scoring |

### `user_reading_submissions` (`src/db/schema/submissions.ts`)
One row per attempt (retakes allowed; no uniqueness constraint on `userId+readingId`).

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `userId` | integer FK → users.id | CASCADE delete |
| `readingId` | integer FK → readings.id | CASCADE delete |
| `answers` | text | JSON: `[{ question_id, option_id }]` — raw submission stored verbatim |
| `correctCount` | integer | Server-computed |
| `totalQuestions` | integer | Server-computed from DB (not trusting client count) |
| `bandScore` | real | 0–9 in 0.5 steps, computed by `calculateBandScore` |
| `timeTakenSeconds` | integer | Client-reported |
| `submittedAt` | timestamp | Unix epoch |

### `listenings` (`src/db/schema/listenings.ts`)
Audio exercises. `audioKey` is the R2 object key; presigned GET URLs are generated per-request.

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `title` | text | Display title |
| `audioKey` | text | R2 object key — e.g. `"listening/easy/<uuid>.webm"` |
| `transcript` | text? | Nullable; withheld until post-submission |
| `level` | `"easy"│"medium"│"hard"` | |
| `durationSeconds` | integer | Audio length in seconds; shown as playback hint |
| `createdAt` | timestamp | Unix epoch |

### `listening_questions` + `listening_question_options` (`src/db/schema/listening_questions.ts`)
Mirror the shape of `questions` / `question_options` but belong exclusively to listenings (separate table — see listenings.ts for rationale).

**`listening_questions`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `listeningId` | integer FK → listenings.id | CASCADE delete |
| `order` | integer | Display order (0-based) |
| `text` | text | Question text |
| `type` | `"multiple_choice"│"true_false_not_given"` | |
| `explanation` | text? | Revealed post-submission |

**`listening_question_options`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `questionId` | integer FK → listening_questions.id | CASCADE delete |
| `label` | text | `"A"/"B"/"C"/"D"` or `"True"/"False"/"Not Given"` |
| `text` | text | Option text |
| `isCorrect` | boolean | **NEVER returned to the client** |

### `user_listening_submissions` (`src/db/schema/listening_submissions.ts`)
One row per attempt. Same shape as `user_reading_submissions`.

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `userId` | integer FK → users.id | CASCADE delete |
| `listeningId` | integer FK → listenings.id | CASCADE delete |
| `answers` | text | JSON: `[{ question_id, option_id }]` |
| `correctCount` | integer | Server-computed |
| `totalQuestions` | integer | Server-computed (anti-cheat) |
| `bandScore` | real | 0–9 in 0.5 steps |
| `timeTakenSeconds` | integer | Client-reported |
| `submittedAt` | timestamp | Unix epoch |

---

## Gamification schema

### `characters` (`src/db/schema/characters.ts`)
One character per skill per user. HP decreases on wrong answers; XP drives level-up.

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `userId` | integer FK → users.id | CASCADE delete |
| `skill` | `"reading"│"listening"│"writing"│"speaking"` | |
| `hp` | integer | Current HP; max 100; default `100` |
| `xp` | integer | Lifetime XP for this character; default `0` |
| `level` | integer | default `1` |
| `skinId` | text? | Nullable — references a `shop_items` id resolved in app layer |
| `isAlive` | boolean | `false` when HP reaches 0; default `true` |
| `createdAt` | timestamp | Unix epoch |

---

### `user_stats` (`src/db/schema/user_stats.ts`)
One row per user (unique constraint on `userId`). Tracks lifetime economy state.

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `userId` | integer FK → users.id UNIQUE | CASCADE delete |
| `totalXp` | integer | Sum across all characters; default `0` |
| `coins` | integer | Spendable currency; default `0` |
| `streakDays` | integer | Consecutive days with activity; default `0` |
| `lastActivityDate` | text? | ISO date `YYYY-MM-DD`; null until first activity |
| `createdAt` | timestamp | Unix epoch |

---

### `quests` + `user_quests` (`src/db/schema/quests.ts`)
`quests` are reusable templates (seeded by admins). `user_quests` track daily progress.

**`quests`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `titleMn` | text | Mongolian display title |
| `descriptionMn` | text | Mongolian description |
| `skillTarget` | `"reading"│"listening"│"writing"│"speaking"│"any"` | `"any"` counts all skills |
| `requiredCount` | integer | Number of completions required |
| `xpReward` | integer | XP granted on completion |
| `coinReward` | integer | Coins granted on completion |
| `isActive` | boolean | Whether the quest is currently assignable; default `true` |

**`user_quests`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `userId` | integer FK → users.id | CASCADE delete |
| `questId` | integer FK → quests.id | CASCADE delete |
| `date` | text | ISO date `YYYY-MM-DD` — the day this quest was assigned |
| `progress` | integer | How many times the activity has been completed; default `0` |
| `isCompleted` | boolean | default `false` |
| `completedAt` | timestamp? | Null until completed |

---

### `shop_items` + `user_inventory` (`src/db/schema/shop.ts`)
`shop_items` is the catalogue; `user_inventory` records purchases.

**`shop_items`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `nameMn` | text | Mongolian name |
| `descriptionMn` | text | Mongolian description |
| `type` | `"booster"│"cosmetic_profile"│"cosmetic_character"` | |
| `effectKey` | text? | e.g. `"xp_multiplier_2x"`; null for pure cosmetics |
| `priceCoin` | integer | Cost in coins |
| `iconKey` | text | Asset key resolved by the client |
| `isAvailable` | boolean | Whether the item appears in the shop; default `true` |

**`user_inventory`**
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `userId` | integer FK → users.id | CASCADE delete |
| `itemId` | integer FK → shop_items.id | CASCADE delete |
| `purchasedAt` | timestamp | Unix epoch; DB default `unixepoch()` |
| `expiresAt` | timestamp? | Null = permanent; set for time-limited boosters |
| `isEquipped` | boolean | App code must enforce at-most-one equipped per slot; default `false` |

---

### `leaderboard_snapshots` (`src/db/schema/leaderboard_snapshots.ts`)
Weekly top-10 snapshot written by the Monday cron. One row per user per snapshot date.

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `snapshotDate` | text | ISO date `YYYY-MM-DD` of the Monday the snapshot was taken |
| `userId` | integer FK → users.id | CASCADE delete |
| `rank` | integer | 1–10 |
| `totalXp` | integer | XP at snapshot time |
| `createdAt` | timestamp | Unix epoch |

---

## API routes

### Auth — `/auth`

#### `POST /auth/signup`
Creates a new user account.

**Body:**
```json
{ "username": "john_doe", "email": "john@example.com", "password": "1234" }
```
- `username`: 3–30 chars, `[a-zA-Z0-9_]`
- `password`: exactly 4 digits

**Responses:**
- `201` — user created (no `password` field)
- `400` — validation failure
- `409` — email or username already taken

---

#### `POST /auth/signin`
Verifies credentials and returns a JWT.

**Body:**
```json
{ "identifier": "john@example.com", "password": "1234" }
```
- `identifier`: email (contains `@`) **or** username — auto-detected server-side
- `password`: exactly 4 digits

**Response `200`:**
```json
{
  "token": "<JWT — valid 7 days>",
  "user": { "id": 1, "username": "john_doe", "email": "...", "isOnboarding": true, "onboardingStep": 0, "createdAt": 1234567890 }
}
```

**Responses:**
- `200` — success
- `400` — validation failure
- `401` — wrong password
- `404` — no account for that email / username

---

#### `POST /auth/onboarding/step` (JWT required)
Advances the user through the 4-step onboarding flow. Must be called in order (steps 0 → 1 → 2 → 3). Returns `409` if onboarding is already complete. Returns `400` if the submitted step doesn't match the server's current `onboardingStep`.

**Body (all steps):**
```json
{ "step": 0, "data": { ... } }
```

| Step | `data` fields | What happens |
|---|---|---|
| `0` | `{ "target_band": 7.0 }` | Stores `users.targetBand`; advances to step 1 |
| `1` | `{ "daily_goal_minutes": 30 }` | Stores `users.dailyGoalMinutes`; advances to step 2 |
| `2` | `{ "reading_id": 1, "answers": [{ "question_id": 10, "option_id": 42 }] }` | Scores answers against DB, stores initial `users.readingScore`; advances to step 3 |
| `3` | _(none needed)_ | Creates `user_stats` + 4 character rows + today's quests; sets `isOnboarding=false` |

**Response `200`:**
```json
{ "step": 0, "nextStep": 1, "data": { "target_band": 7.0 } }
```
For step 2, `data` includes `{ "correct_count", "total_questions", "band_score" }`. For step 3, `nextStep` is `null` and `data` is `{ "quests_assigned": 3 }`.

**Responses:** `200`, `400` (wrong step or bad data), `404` (user not found), `409` (onboarding already done), `422` (step 2: reading has no questions)

---

### Reading — `/reading` (JWT required: `Authorization: Bearer <token>`)

#### `GET /reading?level=easy|medium|hard`
Lists all readings (or filtered by level). Does **not** include the full passage or questions.

**Response `200`:**
```json
[{ "id": 1, "title": "...", "level": "easy", "timerSeconds": 300, "questionCount": 5 }]
```

---

#### `GET /reading/:id`
Returns the full reading: passage + questions + options. `isCorrect` is **never** included.

**Response `200`:**
```json
{
  "id": 1,
  "title": "...",
  "passage": "...",
  "level": "medium",
  "timerSeconds": 1200,
  "questions": [
    {
      "id": 10,
      "order": 0,
      "text": "What does the author imply in paragraph 2?",
      "type": "multiple_choice",
      "options": [
        { "id": 40, "questionId": 10, "label": "A", "text": "..." },
        { "id": 41, "questionId": 10, "label": "B", "text": "..." },
        { "id": 42, "questionId": 10, "label": "C", "text": "..." },
        { "id": 43, "questionId": 10, "label": "D", "text": "..." }
      ]
    }
  ]
}
```

**Responses:** `200`, `400` (bad ID), `404`

---

#### `POST /reading/:id/submit`
Scores a completed reading attempt. Server computes correctness from DB (client cannot cheat by sending `is_correct`). Updates `users.readingScore` if the new band is higher than the stored best. Also runs the full gamification chain: streak, quest progress, skill XP, total XP, coins.

**Body:**
```json
{
  "answers": [
    { "question_id": 10, "option_id": 42 },
    { "question_id": 11, "option_id": 47 }
  ],
  "time_taken_seconds": 340
}
```

**Response `200`:**
```json
{
  "correct_count": 4,
  "total_questions": 5,
  "band_score": 7.0,
  "time_taken_seconds": 340,
  "answers": [
    { "question_id": 10, "option_id": 42, "is_correct": true, "explanation": "The author uses 'however' to signal..." },
    { "question_id": 11, "option_id": 47, "is_correct": false, "explanation": null }
  ],
  "xp_earned": 150,
  "coins_earned": 8,
  "quests_completed": [
    { "titleMn": "Нэг дасгал хий", "xp_reward": 50, "coin_reward": 10 }
  ],
  "character": { "skill": "reading", "hp": 100, "level": 2, "xp": 160 },
  "rewards": {
    "skill_xp": 160,
    "skill_level": 2,
    "leveled_up": true,
    "total_xp": 160,
    "coins": 18
  }
}
```

XP formula: `xpEarned = round(bandScore * 20) + 10`; coins: `correctCount * 2`. Quest bonuses added on top.

**Responses:** `200`, `400`, `404`, `422` (reading has no questions)

---

### Listening — `/listening` (JWT required: `Authorization: Bearer <token>`)

#### `GET /listening?level=easy|medium|hard`
Lists all listenings (or filtered by level). Does **not** include audio URL or transcript.

**Response `200`:**
```json
[{ "id": 1, "title": "...", "level": "easy", "durationSeconds": 120, "questionCount": 5 }]
```

---

#### `GET /listening/:id`
Returns metadata + questions + options + a presigned GET URL for the audio file (expires 1h). `isCorrect` and `transcript` are **never** included.

**Response `200`:**
```json
{
  "id": 1,
  "title": "...",
  "level": "easy",
  "durationSeconds": 120,
  "audioUrl": "<presigned R2 GET URL — 1h TTL>",
  "questions": [
    {
      "id": 10,
      "order": 0,
      "text": "What does the speaker say about X?",
      "type": "multiple_choice",
      "options": [
        { "id": 40, "questionId": 10, "label": "A", "text": "..." },
        { "id": 41, "questionId": 10, "label": "B", "text": "..." }
      ]
    }
  ]
}
```

**Responses:** `200`, `400` (bad ID), `404`

---

#### `POST /listening/:id/submit`
Scores a completed listening attempt. Same anti-cheat and best-score logic as reading. Additionally runs the full gamification chain: streak, quest progress, skill XP, total XP, coins.

**Body:**
```json
{
  "answers": [
    { "question_id": 10, "option_id": 42 },
    { "question_id": 11, "option_id": 47 }
  ],
  "time_taken_seconds": 95
}
```

**Response `200`:**
```json
{
  "correct_count": 4,
  "total_questions": 5,
  "band_score": 7.0,
  "time_taken_seconds": 95,
  "answers": [
    { "question_id": 10, "option_id": 42, "is_correct": true, "explanation": "..." }
  ],
  "rewards": {
    "skill_xp": 90,
    "skill_level": 2,
    "leveled_up": false,
    "total_xp": 90,
    "coins": 14
  },
  "completed_quests": [
    { "title": "Нэг дасгал хий", "xp_reward": 50, "coin_reward": 10 }
  ]
}
```

XP formula: `skillXp = correctCount * 5 + 10`; coins: `floor(bandScore) * 2`. Quest bonuses added on top.

**Responses:** `200`, `400`, `404`, `422` (no questions)

---

### Admin — `/admin` (header: `X-Admin-Key: <ADMIN_API_KEY>`)

These routes are for seeding/managing content. They are **not** called by the mobile app.

#### `POST /admin/readings`
Creates a reading, its questions, and all answer options in a single DB transaction.

**Body:**
```json
{
  "title": "Climate Change",
  "passage": "Full passage text here...",
  "level": "medium",
  "timer_seconds": 1200,
  "questions": [
    {
      "order": 0,
      "text": "What is the main argument?",
      "type": "multiple_choice",
      "explanation": "Paragraph 1 states clearly that...",
      "options": [
        { "label": "A", "text": "...", "is_correct": false },
        { "label": "B", "text": "...", "is_correct": true },
        { "label": "C", "text": "...", "is_correct": false },
        { "label": "D", "text": "...", "is_correct": false }
      ]
    }
  ]
}
```
- Exactly one option per question must have `is_correct: true` (validated by Zod).

**Response `201`:** `{ "id": 5, "message": "Reading created successfully" }`

---

#### `GET /admin/readings`
Lists all readings with question count (same shape as `GET /reading` but includes `createdAt`).

---

#### `DELETE /admin/readings/:id`
Deletes a reading. Questions and options are cascade-deleted automatically.

**Responses:** `200`, `400`, `404`

---

#### `POST /admin/listenings`
Two-step flow for creating a listening exercise (audio must live in R2 first):

**Step 1 — get an upload URL** (omit `audioKey` or pass `null`):
```json
{ "title": "Airport Announcement", "level": "easy", "duration_seconds": 90, "questions": [...] }
```
Returns `{ uploadUrl, audioKey }` — PUT the audio file directly to `uploadUrl` (presigned, 10 min TTL). No DB row is inserted yet.

**Step 2 — create the record** (include the confirmed `audioKey`):
```json
{
  "title": "Airport Announcement",
  "audioKey": "listening/easy/<uuid>.webm",
  "transcript": "Optional transcript text...",
  "level": "easy",
  "duration_seconds": 90,
  "questions": [
    {
      "order": 0,
      "text": "Where is the speaker?",
      "type": "multiple_choice",
      "explanation": "The speaker mentions 'gate 12'...",
      "options": [
        { "label": "A", "text": "Airport", "is_correct": true },
        { "label": "B", "text": "Train station", "is_correct": false }
      ]
    }
  ]
}
```
- Exactly one option per question must have `is_correct: true` (Zod validated).

**Response `201`:** `{ "id": 3, "message": "Listening created successfully" }`

---

### Game — `/game` (JWT required: `Authorization: Bearer <token>`)

#### `GET /game/state`
Returns the full player state in one call. Lazy-initialises `user_stats` and all 4 character rows if they don't exist yet.

**Response `200`:**
```json
{
  "stats": { "totalXp": 320, "coins": 45, "streakDays": 3, "lastActivityDate": "2026-05-28" },
  "characters": [
    { "skill": "reading",   "hp": 100, "xp": 200, "level": 2, "isAlive": true, "skinId": null },
    { "skill": "listening", "hp": 80,  "xp": 120, "level": 1, "isAlive": true, "skinId": null },
    { "skill": "writing",   "hp": 100, "xp": 0,   "level": 1, "isAlive": true, "skinId": null },
    { "skill": "speaking",  "hp": 100, "xp": 0,   "level": 1, "isAlive": true, "skinId": null }
  ],
  "quests": [
    { "id": 1, "titleMn": "Нэг дасгал хий", "descriptionMn": "...", "skillTarget": "reading",
      "requiredCount": 1, "progress": 0, "isCompleted": false, "xpReward": 50, "coinReward": 10 }
  ]
}
```

---

#### `POST /game/checkin`
Records today's activity (streak), then auto-generates today's quests if this is the first check-in of the day.

**Response `200`:**
```json
{ "streakDays": 4, "wasNew": true, "date": "2026-05-28", "quests": [...] }
```
`wasNew: false` means the user already checked in today — streak unchanged, quests unchanged.

---

#### `POST /game/revive`
Spends 50 coins to restore a dead (or damaged) character to full HP.

**Body:** `{ "skill": "reading" | "listening" | "writing" | "speaking" }`

**Response `200`:**
```json
{ "character": { "skill": "reading", "hp": 100, "xp": 200, "level": 2, "isAlive": true, "skinId": null }, "coins": 0 }
```

**Responses:** `200`, `400` (validation), `402` `{ "error": "Хүрэлцэхгүй монет", "coins": <current> }` if insufficient coins

---

#### `GET /game/leaderboard`
Top 20 users by lifetime XP.

**Response `200`:**
```json
[
  { "rank": 1, "userId": 42, "username": "top_learner", "totalXp": 5000, "streakDays": 14 },
  { "rank": 2, "userId": 7,  "username": "studyhard",   "totalXp": 3200, "streakDays": 5 }
]
```

---

## Utilities / lib

### `src/lib/auth-middleware.ts`
JWT Bearer middleware. Reads `Authorization: Bearer <token>`, calls `hono/jwt` `verify()` (Web Crypto, CF-compatible), and sets `userId: number` and `username: string` on the Hono context.

```ts
// Use in any route file that needs auth:
router.use("*", authMiddleware);
const userId = c.get("userId"); // number
```

### `src/lib/band-score.ts`
Converts `(correctCount, totalQuestions)` to an IELTS band score (0–9, 0.5 increments) using normalised percentage thresholds derived from the official IELTS Academic Reading conversion table.

```ts
calculateBandScore(4, 5)  // → 7.0
calculateBandScore(0, 5)  // → 0.0
```

### `src/lib/password.ts`
PBKDF2 + SHA-256, 100 k iterations, 16-byte random salt. Output is base64-encoded `(salt || derivedKey)`. `verifyPassword` uses constant-time comparison to prevent timing attacks.

### `src/lib/quest-engine.ts`
Daily quest assignment, progress tracking, and completion. No module-level DB.

**Exported types:**
- `CompletedQuest` — `UserQuest` + `{ titleMn, skillTarget, xpReward, coinReward }` — returned by `incrementQuestProgress` so callers can immediately award rewards via xp-engine.
- `QuestWithTemplate` — `UserQuest` + full quest template fields — returned by `getTodayQuests`.

**Functions:**

| Function | What it does | Returns |
|---|---|---|
| `generateDailyQuests(db, userId, dateIso)` | Fetches all active quest templates, excludes ones already assigned for this user+date, Fisher-Yates shuffles the remainder, inserts up to 3 new `user_quests` rows | `UserQuest[]` (newly inserted) |
| `incrementQuestProgress(db, userId, skill, dateIso)` | Joins today's incomplete `user_quests` with templates; filters where `skillTarget === skill \|\| skillTarget === "any"`; increments `progress` by 1; marks `isCompleted=true` + sets `completedAt` when `progress >= requiredCount` | `CompletedQuest[]` (only newly completed) |
| `getTodayQuests(db, userId, dateIso)` | Single inner-join query returning all quests (any state) for the given user+date | `QuestWithTemplate[]` |

`generateDailyQuests` is idempotent per day — calling it twice won't create duplicate quests. All DB writes use sequential `for` loops (D1 serial requirement).

**Seed file:** `src/db/seeds/quests.sql` — 10 starter quests in Mongolian.

| Skill | Quests |
|---|---|
| `reading` | Complete 1; Complete 3 |
| `listening` | Complete 1; Complete 3 |
| `writing` | Complete 1 |
| `speaking` | Complete 1 |
| `any` | Complete 1 / 3 / 5 / 10 |

XP rewards range from 30 (any×1) to 500 (any×10). Uses `INSERT OR IGNORE` so it's safe to re-run.

```bash
# Local dev
wrangler d1 execute bandup-db --local --file=src/db/seeds/quests.sql
# Production
wrangler d1 execute bandup-db --file=src/db/seeds/quests.sql
```

---

### `src/lib/streak-engine.ts`
Daily streak tracking and streak-break damage. No module-level DB; all DB functions accept a `Database` instance.

**Exported constant:**
- `HP_DAMAGE_PER_MISS = 20` — HP deducted from every character when a streak is broken.

**Functions:**

| Function | What it does | Returns |
|---|---|---|
| `recordActivity(db, userId, dateIso)` | Upserts `user_stats`; increments streak if `lastActivityDate` was yesterday, resets to 1 if older, no-ops if already today | `{ streakDays, wasNew }` |
| `applyMissedStreakDamage(db)` | **Cron handler.** Finds all users with `lastActivityDate < today AND streakDays > 0`; inside one transaction: resets `streakDays=0`, deals `HP_DAMAGE_PER_MISS` to every character, sets `isAlive=false` on characters hitting 0 HP | `{ affected }` |
| `getStreakInfo(db, userId)` | Returns streak state + per-skill HP snapshot; HP is `null` for skills with no character row yet | `{ streakDays, lastActivityDate, hp: {reading,listening,writing,speaking} }` |

Date arithmetic uses UTC (`Date.setUTCDate`) so the engine is timezone-safe. The damage sweep selects affected users before opening the transaction, then iterates with sequential `for` loops (D1 serial requirement — no `Promise.all`).

---

### `src/lib/xp-engine.ts`
Gamification helpers. Pure functions handle the math; DB functions accept a `Database` instance (created by the caller via `createDb(c.env.DB)`) — never module-level.

**Pure:**
```ts
xpToLevel(xp)           // floor(1 + sqrt(xp / 100)), capped at 50
levelToXpThreshold(lvl) // (lvl - 1)^2 * 100 — minimum XP to reach that level
```

**DB (all return a Promise):**

| Function | What it does | Returns |
|---|---|---|
| `awardSkillXp(db, userId, skill, xpAmount)` | Adds XP to the matching `characters` row; creates the row if absent; recomputes `level` | `{ newXp, newLevel, leveledUp }` |
| `awardUserXp(db, userId, xpAmount)` | Upserts `user_stats.totalXp += xpAmount` | `{ totalXp }` |
| `awardCoins(db, userId, amount)` | Upserts `user_stats.coins += amount` | `{ coins }` |
| `spendCoins(db, userId, amount)` | Deducts coins; no-ops and returns `success: false` if balance is insufficient | `{ coins, success }` |

`awardUserXp` and `awardCoins` use `INSERT … ON CONFLICT DO UPDATE` so callers never need to pre-create the `user_stats` row.

---

### `src/lib/r2-audio.ts`
Presigned URL helpers for Cloudflare R2. All functions accept an `R2Bucket` instance — always pass `c.env.AUDIO_BUCKET` from inside a handler, never at module level.

| Function | What it does | Returns |
|---|---|---|
| `getAudioPresignUrl(r2, key, expiresIn=3600)` | Presigned GET URL for any R2 object | `Promise<string>` |
| `getListeningUploadUrl(r2, level, expiresIn=600)` | Presigned PUT URL for a listening file. Key pattern: `listening/{level}/{uuid}.webm` | `Promise<{ uploadUrl, audioKey }>` |
| `getSpeakingUploadUrl(r2, userId, attemptId, expiresIn=600)` | Presigned PUT URL for a speaking recording. Key pattern: `speaking/{userId}/{attemptId}.webm` | `Promise<{ uploadUrl, audioKey }>` |
| `deleteAudio(r2, key)` | Deletes an object from the bucket (admin cleanup) | `Promise<void>` |

```ts
// Example usage in a route handler:
const r2 = c.env.AUDIO_BUCKET;
const { uploadUrl, audioKey } = await getSpeakingUploadUrl(r2, userId, attemptId);
```

---

## Cron Triggers

Two cron schedules are configured in `wrangler.jsonc` under `triggers.crons`. The handler is the `scheduled` export in `src/index.tsx` (the default export is `{ fetch, scheduled }` — not bare `app`).

| Cron | UTC time | What it does |
|---|---|---|
| `0 17 * * *` | 17:00 daily | Midnight Ulaanbaatar (UTC+8): runs `applyMissedStreakDamage` — resets streaks and deals HP damage to all users who had no activity yesterday |
| `0 0 * * 1` | 00:00 Monday | Weekly leaderboard snapshot: queries top 10 by `totalXp`, deletes any existing snapshot for that date (idempotent), inserts new rows into `leaderboard_snapshots` |

**Testing locally:**
```bash
# Trigger a specific cron via the Miniflare REST API (while dev server is running)
curl "http://localhost:8787/__scheduled?cron=0+17+*+*+*"
```

---

## Conventions & patterns

- **Accessing the DB**: always `createDb(c.env.DB)` inside a handler — never at module level (Workers are stateless per-request).
- **Returning JSON**: `c.json(data, status)`. Errors follow `{ "error": "message" }`.
- **Validation**: schema is defined and exported from the controller file (`export const xyzSchema = z.object({...})`), then applied in the route file via `zValidator("json", xyzSchema)`. The handler calls `c.req.json<T>()` (or `c.req.valid("json")`) safely.
- **Never leak `isCorrect`**: `GET /reading/:id` deliberately omits `isCorrect` from its query; scoring is done server-side in `submit.controller.ts`.
- **Anti-cheat**: `totalQuestions` in submit is taken from the DB, not from the client's answer array.
- **Best-score only**: `users.readingScore` is updated only when `newBand > currentBand`.
- **D1 transactions**: D1 runs queries serially — use a sequential `for` loop inside `db.transaction()`, not `Promise.all`.
- **Adding a new route group**: create `src/routes/<name>.ts` + `src/controllers/<name>/`, then `app.route("/path", handler)` in `src/index.tsx`.
- **Crypto**: only Web Crypto API (`crypto.subtle`). No `bcrypt`, no Node `crypto`.

---

## Adding Cloudflare bindings (KV, R2, etc.)

1. Add the binding in `wrangler.jsonc`
2. Run `bun run cf-typegen` to update `worker-configuration.d.ts`
3. Access via `c.env.<BINDING_NAME>` — fully typed

---

## What's next (planned, not yet built)

- `POST /auth/refresh` — token refresh endpoint
- Speaking / Writing exercise routes (same pattern as reading/listening)
- `GET /game/leaderboard/history` — surface past weekly snapshots from `leaderboard_snapshots`
- GraphQL layer (`graphql` package is installed, not wired up yet)
