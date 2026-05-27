# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**BandUp** is a mobile app backend for IELTS learners. Users sign up, complete onboarding, then take reading exercises (passages + MCQ / True-False-Not-Given questions). The server scores answers, converts results to IELTS band scores, and tracks each user's personal best. The backend runs entirely on **Cloudflare Workers** — no Node.js, no traditional server.

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
├── index.tsx                          # App entry — registers global error handler + 3 route groups
├── renderer.tsx                       # JSX layout wrapper (Hono JSX, NOT React)
├── style.css                          # Global stylesheet
│
├── db/
│   ├── index.ts                       # createDb(d1) — creates a Drizzle client from a D1 binding
│   └── schema/
│       ├── index.ts                   # Re-exports all tables + relations
│       ├── users.ts                   # users table
│       ├── readings.ts                # readings table
│       ├── questions.ts               # questions + question_options tables
│       ├── submissions.ts             # user_reading_submissions table
│       └── relations.ts               # Drizzle relation definitions (for relational queries)
│
├── routes/
│   ├── auth.ts                        # /auth/* — public (signup, signin)
│   ├── reading.ts                     # /reading/* — requires JWT
│   └── admin.ts                       # /admin/* — requires X-Admin-Key header
│
├── controllers/
│   ├── auth/
│   │   ├── signup.controller.ts       # POST /auth/signup
│   │   └── signin.controller.ts       # POST /auth/signin → issues JWT
│   ├── reading/
│   │   ├── list.controller.ts         # GET /reading?level=
│   │   ├── get.controller.ts          # GET /reading/:id (passage + questions, NO correct answers)
│   │   └── submit.controller.ts       # POST /reading/:id/submit → scores + saves attempt
│   └── admin/
│       ├── createReading.controller.ts  # POST /admin/readings (reading + questions + options in one TX)
│       ├── listReadings.controller.ts   # GET /admin/readings
│       └── deleteReading.controller.ts  # DELETE /admin/readings/:id
│
└── lib/
    ├── auth-middleware.ts             # JWT Bearer verification; sets userId + username on context
    ├── band-score.ts                  # calculateBandScore(correct, total) → 0–9 IELTS band
    └── password.ts                    # hashPassword / verifyPassword (PBKDF2, constant-time)

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
| `onboardingStep` | integer | Current onboarding step; default `0` |
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

---

## API routes

### Auth — `/auth` (public, no token required)

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
Scores a completed reading attempt. Server computes correctness from DB (client cannot cheat by sending `is_correct`). Updates `users.readingScore` if the new band is higher than the stored best.

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
  ]
}
```

**Responses:** `200`, `400`, `404`, `422` (reading has no questions)

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
- Onboarding flow endpoints (step progression, score submission)
- Listening / Speaking / Writing exercise routes (same pattern as reading)
- GraphQL layer (`graphql` package is installed, not wired up yet)
