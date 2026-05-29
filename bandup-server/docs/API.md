# BandUp API Reference

**Base URL (production):** `https://bandup-server.<subdomain>.workers.dev`  
**Base URL (local dev):** `http://localhost:8787`

---

## Authentication overview

| Method | Where | Value |
|--------|-------|-------|
| **JWT** | `Authorization` header | `Bearer <token>` — issued by `POST /auth/signin`, valid 7 days |
| **Admin key** | `X-Admin-Key` header | Static secret set via `wrangler secret put ADMIN_API_KEY` |

All errors follow the shape `{ "error": "<Mongolian message string>" }`.

---

## Mongolian error messages reference

| Key | Message | Meaning |
|-----|---------|---------|
| `AUTH_INVALID` | Нэвтрэх мэдээлэл буруу байна | Wrong credentials |
| `AUTH_TAKEN` | Энэ нэр эсвэл имэйл бүртгэлтэй байна | Username/email already registered |
| `AUTH_MISSING_TOKEN` | Нэвтрэх токен байхгүй байна | No Bearer token sent |
| `AUTH_INVALID_TOKEN` | Токен хүчингүй эсвэл хугацаа дууссан байна | Token invalid or expired |
| `AUTH_UNAUTHORIZED` | Зөвшөөрөлгүй хүсэлт | Wrong/missing admin key |
| `ONBOARDING_DONE` | Бүртгэлийн алхам аль хэдийн дууссан байна | Onboarding already complete |
| `INVALID_STEP` | Буруу алхам | Step number doesn't match server state |
| `NOT_FOUND` | Олдсонгүй | Resource not found |
| `INVALID_ID` | Буруу ID | Path parameter is not a valid integer |
| `VALIDATION_ERROR` | Оруулсан мэдээлэл буруу байна | Request body failed schema validation |
| `INTERNAL_ERROR` | Серверийн дотоод алдаа гарлаа | Unhandled server error |
| `NO_QUESTIONS` | Дасгалд асуулт байхгүй байна | Exercise has no questions in DB |
| `INSUFFICIENT_COINS` | Хүрэлцэхгүй монет | Not enough coins |
| `CHARACTER_DEAD` | Тэмдэгт нас барсан байна. Эргүүлэн амилуулна уу | Character HP = 0 |
| `STREAK_BROKEN` | Streak тасарлаа! HP хасагдлаа | Streak reset, HP damage applied |
| `BOOSTER_NOT_EQUIPPABLE` | Бустер зүүх боломжгүй | Boosters cannot be equipped |

---

## Shared types

```ts
type Level = "easy" | "medium" | "hard";
type Skill = "reading" | "listening" | "writing" | "speaking";
type SkillTarget = Skill | "any";
type ItemType = "booster" | "cosmetic_profile" | "cosmetic_character";
type QuestionType = "multiple_choice" | "true_false_not_given";

type Answer = {
  question_id: number;
  option_id: number;
};

type Option = {
  id: number;
  questionId: number;
  label: string;     // "A" | "B" | "C" | "D" | "True" | "False" | "Not Given"
  text: string;
};

type Question = {
  id: number;
  order: number;
  text: string;
  type: QuestionType;
  options: Option[];
};

type Character = {
  skill: Skill;
  hp: number;       // 0–100
  xp: number;
  level: number;    // 1–50
  isAlive: boolean;
  skinId: string | null;
};

type Quest = {
  id: number;
  titleMn: string;
  skillTarget: SkillTarget;
  requiredCount: number;
  progress: number;
  isCompleted: boolean;
  xpReward: number;
  coinReward: number;
};

type AnswerDetail = {
  question_id: number;
  option_id: number;
  is_correct: boolean;
  explanation: string | null;   // revealed only after submission
};

type Rewards = {
  skill_xp: number;
  skill_level: number;
  leveled_up: boolean;
  total_xp: number;
  coins: number;
};

type CompletedQuest = {
  titleMn: string;
  xp_reward: number;
  coin_reward: number;
};
```

---

## 1. Auth — `/auth`

### `POST /auth/signup`

**Auth:** None

Creates a new user account. Password is a 4-digit PIN hashed server-side with PBKDF2.

**Request body:**
```ts
{
  username: string;   // 3–30 chars, [a-zA-Z0-9_]
  email: string;      // valid email
  password: string;   // exactly 4 digits, e.g. "1234"
}
```

**Response `201`:**
```ts
{
  id: number;
  username: string;
  email: string;
  isOnboarding: boolean;    // always true for new users
  onboardingStep: number;   // always 0 for new users
  createdAt: number;        // Unix epoch
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Validation failure | Оруулсан мэдээлэл буруу байна |
| `409` | Email or username already taken | Энэ нэр эсвэл имэйл бүртгэлтэй байна |

---

### `POST /auth/signin`

**Auth:** None

Verifies credentials and issues a JWT. Accepts either email or username as `identifier`. Response timing is normalised to prevent username enumeration.

**Request body:**
```ts
{
  identifier: string;   // email (contains "@") or username — auto-detected
  password: string;     // exactly 4 digits
}
```

**Response `200`:**
```ts
{
  token: string;   // JWT, valid 7 days — include as "Bearer <token>"
  user: {
    id: number;
    username: string;
    email: string;
    isOnboarding: boolean;
    onboardingStep: number;   // 0–3
    createdAt: number;        // Unix epoch
  };
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Validation failure | Оруулсан мэдээлэл буруу байна |
| `401` | Wrong credentials or no such account | Нэвтрэх мэдээлэл буруу байна |

---

### `POST /auth/onboarding/step`

**Auth:** JWT

Advances the user through the 4-step onboarding flow. Steps must be completed in order (0 → 1 → 2 → 3). After step 3 completes, `isOnboarding` becomes `false` and this endpoint returns `409` for any further calls.

**Request body:**
```ts
{
  step: 0 | 1 | 2 | 3;
  data?: unknown;   // shape depends on step — see below
}
```

**Step 0 — Set target band**

`data`:
```ts
{ target_band: number }   // 0–9, multiples of 0.5
```
Response `data`:
```ts
{ target_band: number }
```

**Step 1 — Set daily study goal**

`data`:
```ts
{ daily_goal_minutes: number }   // integer, 5–480
```
Response `data`:
```ts
{ daily_goal_minutes: number }
```

**Step 2 — Placement reading test**

`data`:
```ts
{
  reading_id: number;
  answers: Answer[];   // at least 1 answer
}
```
Response `data`:
```ts
{
  correct_count: number;
  total_questions: number;
  band_score: number;   // 0–9, stored as users.readingScore
}
```

**Step 3 — Complete onboarding**

`data`: omit or `{}` — nothing required.

Response `data`:
```ts
{ quests_assigned: number }   // number of daily quests generated (up to 3)
```
Creates `user_stats`, all 4 `characters` rows, and today's quests. Sets `isOnboarding = false`.

**Full response envelope (all steps):**
```ts
{
  step: number;
  nextStep: number | null;   // null when onboarding is done (after step 3)
  data: object;              // shape per step as above
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Wrong step number or invalid `data` | Буруу алхам / Оруулсан мэдээлэл буруу байна |
| `401` | Missing or invalid token | Нэвтрэх токен байхгүй байна / Токен хүчингүй эсвэл хугацаа дууссан байна |
| `404` | User not found | Олдсонгүй |
| `409` | Onboarding already complete | Бүртгэлийн алхам аль хэдийн дууссан байна |
| `422` | Step 2: reading has no questions | Дасгалд асуулт байхгүй байна |

---

## 2. Reading — `/reading`

All routes require `Authorization: Bearer <token>`.

### `GET /reading`

**Auth:** JWT

Lists readings. Optionally filter by level.

**Query params:**
```
?level=easy|medium|hard   (optional)
```

**Response `200`:**
```ts
Array<{
  id: number;
  title: string;
  level: Level;
  timerSeconds: number;
  questionCount: number;
}>
```

---

### `GET /reading/:id`

**Auth:** JWT

Returns a reading with its full passage, questions, and answer options. `isCorrect` is **never** included in the response — answers are scored server-side.

**Path param:** `id` — integer reading ID

**Response `200`:**
```ts
{
  id: number;
  title: string;
  passage: string;
  level: Level;
  timerSeconds: number;
  questions: Question[];   // options inside each question, isCorrect omitted
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Non-integer `:id` | Буруу ID |
| `404` | Reading not found | Олдсонгүй |

---

### `POST /reading/:id/submit`

**Auth:** JWT

Scores a completed reading attempt. `totalQuestions` is taken from the DB (client cannot inflate it). Updates `users.readingScore` only if the new band is strictly higher than the stored best. Runs the full gamification chain: streak, quest progress, skill XP, total XP, coins.

**Path param:** `id` — integer reading ID

**Request body:**
```ts
{
  answers: Answer[];              // at least 1
  time_taken_seconds: number;     // non-negative integer, client-reported
}
```

**XP / coin formulas:**
- `xp_earned = round(band_score × 20) + 10`
- `coins_earned = correct_count × 2`
- Quest completion bonuses are added on top.

**Response `200`:**
```ts
{
  correct_count: number;
  total_questions: number;
  band_score: number;             // 0–9, 0.5 steps
  time_taken_seconds: number;
  answers: AnswerDetail[];        // explanation revealed here
  xp_earned: number;
  coins_earned: number;
  quests_completed: CompletedQuest[];
  character: {
    skill: "reading";
    hp: number;
    level: number;
    xp: number;
  };
  rewards: Rewards;
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Validation failure or non-integer `:id` | Оруулсан мэдээлэл буруу байна / Буруу ID |
| `404` | Reading not found | Олдсонгүй |
| `422` | Reading has no questions in DB | Дасгалд асуулт байхгүй байна |

---

## 3. Listening — `/listening`

All routes require `Authorization: Bearer <token>`.

### `GET /listening`

**Auth:** JWT

Lists listening exercises. Optionally filter by level.

**Query params:**
```
?level=easy|medium|hard   (optional)
```

**Response `200`:**
```ts
Array<{
  id: number;
  title: string;
  level: Level;
  durationSeconds: number;
  questionCount: number;
}>
```

---

### `GET /listening/:id`

**Auth:** JWT

Returns a listening exercise with its questions, answer options, and a presigned audio URL. `isCorrect` and `transcript` are **never** included.

**Path param:** `id` — integer listening ID

**Response `200`:**
```ts
{
  id: number;
  title: string;
  level: Level;
  durationSeconds: number;
  audioUrl: string;     // presigned R2 GET URL, expires in 1 hour — stream directly
  questions: Question[];
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Non-integer `:id` | Буруу ID |
| `404` | Listening not found | Олдсонгүй |

---

### `POST /listening/:id/submit`

**Auth:** JWT

Scores a completed listening attempt. Same anti-cheat and best-score logic as reading. Runs the full gamification chain.

**Path param:** `id` — integer listening ID

**Request body:**
```ts
{
  answers: Answer[];              // at least 1
  time_taken_seconds: number;     // non-negative integer, client-reported
}
```

**XP / coin formulas:**
- `skill_xp = correct_count × 5 + 10`
- `coins = floor(band_score) × 2`
- Quest completion bonuses added on top.

**Response `200`:**
```ts
{
  correct_count: number;
  total_questions: number;
  band_score: number;
  time_taken_seconds: number;
  answers: AnswerDetail[];
  rewards: Rewards;
  completed_quests: Array<{
    title: string;       // Mongolian
    xp_reward: number;
    coin_reward: number;
  }>;
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Validation failure or non-integer `:id` | Оруулсан мэдээлэл буруу байна / Буруу ID |
| `404` | Listening not found | Олдсонгүй |
| `422` | Listening has no questions in DB | Дасгалд асуулт байхгүй байна |

---

## 4. Game — `/game`

All routes require `Authorization: Bearer <token>`.

### `GET /game/state`

**Auth:** JWT

Returns the full player state in a single call. Lazy-creates `user_stats` and all four `characters` rows if they don't exist yet (safe to call at any point after signup).

**Response `200`:**
```ts
{
  stats: {
    totalXp: number;
    coins: number;
    streakDays: number;
    lastActivityDate: string | null;   // ISO date "YYYY-MM-DD" or null
  };
  characters: Character[];   // always 4 entries, one per skill
  quests: Array<Quest & { descriptionMn: string }>;
}
```

---

### `POST /game/checkin`

**Auth:** JWT

Records today's activity (increments or resets streak). On the first check-in of the day (`wasNew: true`), auto-generates today's daily quests. Idempotent within the same UTC day — repeat calls return `wasNew: false` with streak unchanged.

**Request body:** none

**Response `200`:**
```ts
{
  streakDays: number;
  wasNew: boolean;     // true = first check-in today; false = already checked in
  date: string;        // ISO date "YYYY-MM-DD"
  quests: Quest[];
}
```

---

### `POST /game/revive`

**Auth:** JWT

Spends 50 coins to restore the named character to full HP (100) and `isAlive: true`. Also creates the character row if it doesn't exist. Returns `402` if the user has fewer than 50 coins.

**Request body:**
```ts
{
  skill: Skill;
}
```

**Response `200`:**
```ts
{
  character: Character;
  coins: number;   // remaining coin balance after deduction
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Invalid `skill` value | Оруулсан мэдээлэл буруу байна |
| `402` | Insufficient coins (< 50) | `{ "error": "Хүрэлцэхгүй монет", "coins": <current balance> }` |

---

### `GET /game/leaderboard`

**Auth:** JWT

Top 20 users by lifetime XP. Live query — not a snapshot.

**Response `200`:**
```ts
Array<{
  rank: number;       // 1–20
  userId: number;
  username: string;
  totalXp: number;
  streakDays: number;
}>
```

---

## 5. Shop — `/shop`

All routes require `Authorization: Bearer <token>`.

### `GET /shop/items`

**Auth:** JWT

Lists all shop items where `isAvailable = true`.

**Response `200`:**
```ts
Array<{
  id: number;
  nameMn: string;
  descriptionMn: string;
  type: ItemType;
  effectKey: string | null;   // e.g. "xp_multiplier_2x"; null for pure cosmetics
  priceCoin: number;
  iconKey: string;             // asset key resolved by the client
  isAvailable: boolean;
}>
```

---

### `GET /shop/inventory`

**Auth:** JWT

Returns the current user's purchased items joined with their item metadata.

**Response `200`:**
```ts
Array<{
  id: number;          // inventory row ID
  itemId: number;      // shop_items.id
  purchasedAt: number; // Unix epoch
  expiresAt: number | null;   // Unix epoch; null = permanent; set for boosters (24h TTL)
  isEquipped: boolean;
  nameMn: string;
  descriptionMn: string;
  type: ItemType;
  effectKey: string | null;
  iconKey: string;
}>
```

---

### `POST /shop/buy`

**Auth:** JWT

Purchases a shop item. Deducts `priceCoin` coins from the user's balance. Boosters receive a 24-hour `expiresAt` timestamp; cosmetics are permanent (`expiresAt: null`).

**Request body:**
```ts
{
  itemId: number;   // must be an available shop item
}
```

**Response `200`:**
```ts
{
  success: true;
  inventory: {
    id: number;
    itemId: number;
    purchasedAt: number;
    expiresAt: number | null;
    isEquipped: boolean;
    nameMn: string;
    descriptionMn: string;
    type: ItemType;
    effectKey: string | null;
    iconKey: string;
  };
  coins: number;   // remaining balance after purchase
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Validation failure | Оруулсан мэдээлэл буруу байна |
| `402` | Insufficient coins | `{ "error": "Хүрэлцэхгүй монет", "coins": <current balance> }` |
| `404` | Item not found or unavailable | Олдсонгүй |

---

### `POST /shop/equip`

**Auth:** JWT

Equips a cosmetic item from the user's inventory. Automatically un-equips any other item of the same type (e.g. equipping a new `cosmetic_character` skin un-equips the previously equipped one). Boosters cannot be equipped.

**Request body:**
```ts
{
  inventoryId: number;   // user_inventory.id — must belong to the authenticated user
}
```

**Response `200`:**
```ts
{
  inventory: Array<{     // full updated inventory (all items, not just the one equipped)
    id: number;
    itemId: number;
    purchasedAt: number;
    expiresAt: number | null;
    isEquipped: boolean;
    nameMn: string;
    descriptionMn: string;
    type: ItemType;
    effectKey: string | null;
    iconKey: string;
  }>;
}
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Item type is booster | Бустер зүүх боломжгүй |
| `400` | Validation failure | Оруулсан мэдээлэл буруу байна |
| `404` | Inventory item not found or belongs to another user | Олдсонгүй |

---

## 6. Battle

Not yet implemented. Planned for a future release.

---

## 7. Admin — `/admin`

All routes require `X-Admin-Key: <ADMIN_API_KEY>` header. The check uses constant-time comparison to prevent timing attacks. These routes are **not** called by the mobile app — they are for content management only.

### `POST /admin/readings`

Creates a reading, its questions, and all answer options in a single DB transaction. Exactly one option per question must have `is_correct: true`.

**Request body:**
```ts
{
  title: string;       // 1–200 chars
  passage: string;     // full reading text
  level: Level;
  timer_seconds: number;   // positive integer; suggested: easy=300, medium=1200, hard=1500
  questions: Array<{
    order: number;       // 0-based display order
    text: string;
    type: QuestionType;
    explanation?: string;   // revealed to users after submission
    options: Array<{
      label: string;     // "A" | "B" | "C" | "D" | "True" | "False" | "Not Given"
      text: string;
      is_correct: boolean;   // exactly one must be true per question
    }>;   // at least 2 options per question
  }>;   // at least 1 question
}
```

**Response `201`:**
```ts
{ id: number; message: "Reading created successfully" }
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Validation failure (including multiple correct options) |
| `401` | Missing or wrong admin key |

---

### `GET /admin/readings`

Lists all readings with question count and creation timestamp. No level filter.

**Response `200`:**
```ts
Array<{
  id: number;
  title: string;
  level: Level;
  timerSeconds: number;
  createdAt: number;      // Unix epoch — included here, omitted from the public list
  questionCount: number;
}>
```

---

### `DELETE /admin/readings/:id`

Deletes a reading. Questions and options are cascade-deleted automatically.

**Path param:** `id` — integer reading ID

**Response `200`:**
```ts
{ message: "Reading deleted" }
```

**Errors:**

| Status | Condition | Error message |
|--------|-----------|---------------|
| `400` | Non-integer `:id` | Буруу ID |
| `401` | Wrong admin key | Зөвшөөрөлгүй хүсэлт |
| `404` | Reading not found | Олдсонгүй |

---

### `POST /admin/listenings`

Two-step flow for creating a listening exercise (audio must be uploaded to R2 before the DB record is created).

#### Step 1 — Get a presigned upload URL

Send the request **without** `audioKey` (or with `audioKey: null`). No DB row is created.

**Request body:**
```ts
{
  level: Level;       // required even in step 1 — determines the R2 key path
  audioKey?: null;    // omit or pass null
}
```

**Response `200`:**
```ts
{
  message: string;   // instructions reminder
  uploadUrl: string; // presigned R2 PUT URL, valid for 10 minutes
  audioKey: string;  // e.g. "listening/easy/<uuid>.webm" — save this for step 2
}
```

PUT the audio file directly to `uploadUrl` (binary, `Content-Type: audio/webm` or similar). No auth header needed for the PUT — it is pre-authorized by R2.

#### Step 2 — Create the DB record

Re-call the same endpoint with the confirmed `audioKey` from step 1.

**Request body:**
```ts
{
  title: string;           // 1–200 chars
  audioKey: string;        // the key returned in step 1
  transcript?: string;     // optional; not returned to clients pre-submission
  level: Level;
  duration_seconds: number;  // positive integer — audio length shown as hint
  questions: Array<{
    order: number;
    text: string;
    type: QuestionType;
    explanation?: string;
    options: Array<{
      label: string;
      text: string;
      is_correct: boolean;   // exactly one must be true per question
    }>;   // at least 2 options
  }>;   // at least 1 question
}
```

**Response `201`:**
```ts
{ id: number; message: "Listening created successfully" }
```

**Errors (both steps):**

| Status | Condition |
|--------|-----------|
| `400` | Validation failure / missing required fields in step 2 |
| `401` | Wrong admin key |

---

## 8. Cron — Scheduled jobs

Cron triggers run on Cloudflare's scheduler. They cannot be called by the mobile app. Trigger manually during local dev:

```bash
# While bun run dev is running:
curl "http://localhost:8787/__scheduled?cron=0+17+*+*+*"
curl "http://localhost:8787/__scheduled?cron=0+0+*+*+1"
```

### Daily streak damage — `0 17 * * *` (UTC)

Runs at **17:00 UTC daily** = midnight Ulaanbaatar (UTC+8).

Finds all users whose `lastActivityDate` is before today and whose `streakDays > 0`. For each affected user, in a single transaction:
- Resets `streakDays` to `0`
- Subtracts 20 HP from every character
- Sets `isAlive = false` for any character that reaches 0 HP

No HTTP response — fires and forgets. Errors are logged to the Cloudflare Workers console.

### Weekly leaderboard snapshot — `0 0 * * 1` (UTC)

Runs at **00:00 UTC every Monday**.

Queries the top 10 users by `totalXp`, deletes any existing `leaderboard_snapshots` row for today (idempotent — safe to re-trigger), then inserts fresh rows with `rank`, `userId`, and `totalXp`. The snapshot is not yet surfaced via an API route but the table is in place.

---

## Notes for the frontend team

1. **Token storage** — store the JWT securely (e.g. platform Keychain / SecureStore). Include it on every protected request as `Authorization: Bearer <token>`.

2. **Onboarding gate** — after sign-in, check `user.isOnboarding`. If `true`, redirect to the onboarding flow and step through `/auth/onboarding/step` in order. Do not call any `/reading`, `/game`, or `/shop` routes until onboarding is complete.

3. **Audio playback** — the `audioUrl` from `GET /listening/:id` is a presigned URL that expires in **1 hour**. Do not cache it across sessions; re-fetch the exercise to get a fresh URL.

4. **Band score** — `0–9` in 0.5 increments, matching the official IELTS Academic Reading scale. `null` in `user.readingScore` / `listeningScore` means the user has not yet completed that exercise type.

5. **Dead characters** — when `character.isAlive === false`, prompt the user to revive via `POST /game/revive` (costs 50 coins). Submitting a reading/listening exercise still works regardless of character state — HP damage is applied by the daily cron, not by exercise submission.

6. **Booster items** — `type === "booster"` items have a 24-hour `expiresAt`. Apply `effectKey` logic client-side (e.g. `"xp_multiplier_2x"`). The server does not yet enforce booster effects — this is planned.

7. **Error handling** — all error bodies are `{ "error": "<Mongolian string>" }`. The `402` responses for insufficient coins additionally include `"coins": <current balance>` alongside `"error"`.
