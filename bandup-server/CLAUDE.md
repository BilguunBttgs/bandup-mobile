# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**BandUp** is a mobile app backend for IELTS learners. This server handles auth, user onboarding, and (eventually) IELTS band score tracking. It runs entirely on **Cloudflare Workers** — no Node.js, no traditional server.

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

> **DB workflow**: edit `src/db/schema.ts` → `db:generate` → `db:migrate:local` (test) → `db:migrate:remote` (prod).

## Architecture

**Runtime**: Cloudflare Workers (via `wrangler`/`workerd`) — Web Crypto API only, no Node.js built-ins.

| Layer | Technology | Notes |
|---|---|---|
| Framework | [Hono](https://hono.dev/) | Lightweight, edge-first; typed via `CloudflareBindings` |
| Database | Cloudflare D1 (SQLite) | Binding name: `DB`; accessed via `c.env.DB` |
| ORM | Drizzle ORM | Schema in `src/db/schema.ts`; migrations in `drizzle/migrations/` |
| Validation | Zod + `@hono/zod-validator` | Validates request bodies before handlers run |
| Password hashing | PBKDF2 + SHA-256 | Web Crypto API; 100k iterations, 16-byte salt; see `src/lib/password.ts` |
| Bundler | Vite + `@cloudflare/vite-plugin` | Replaces running wrangler directly for local dev |

## File structure

```
src/
├── index.tsx          # Hono app entry — registers middleware + routes
├── renderer.tsx       # JSX layout wrapper (Hono JSX, NOT React)
├── style.css          # Global stylesheet injected by the renderer
├── db/
│   ├── index.ts       # createDb(d1) — creates a Drizzle client from a D1 binding
│   └── schema.ts      # All table definitions (users, …)
├── routes/
│   └── auth.ts        # /auth/* — signup (more to come: login, refresh, …)
└── lib/
    └── password.ts    # hashPassword / verifyPassword (PBKDF2, constant-time compare)

drizzle/
└── migrations/        # Auto-generated SQL migration files (commit these)

wrangler.jsonc         # Cloudflare Workers config — name, D1 binding, migrations dir
drizzle.config.ts      # Drizzle Kit config — points to schema + migrations output dir
vite.config.ts         # Vite config — loads cloudflare() and ssrPlugin() plugins
worker-configuration.d.ts  # Auto-generated CF bindings types (run cf-typegen to refresh)
```

## Database schema (`src/db/schema.ts`)

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `username` | text | Unique; 3–30 chars, alphanumeric + underscore |
| `email` | text | Unique |
| `password` | text | PBKDF2 hash of 4-digit PIN |
| `isOnboarding` | boolean | `true` until onboarding is complete |
| `onboardingStep` | integer | Which step the user is on |
| `readingScore` | real | IELTS band (0–9, 0.5 increments); null = not assessed |
| `listeningScore` | real | Same |
| `speakingScore` | real | Same |
| `writingScore` | real | Same |
| `createdAt` | timestamp | Unix epoch, set by DB default |

## API routes

### `POST /auth/signup`
Creates a new user. Returns `201` with user data (no password), `409` on duplicate email/username, `400` on validation failure.

**Body** (JSON):
```json
{ "username": "string (3–30, [a-zA-Z0-9_])", "email": "string", "password": "string (4 digits)" }
```

**Response (201)**:
```json
{ "id": 1, "username": "...", "email": "...", "isOnboarding": true, "onboardingStep": 0, "createdAt": ... }
```

## Conventions & patterns

- **Accessing the DB**: always `createDb(c.env.DB)` inside a handler — never instantiate at module level (Workers are stateless per-request).
- **Returning JSON**: use `c.json(data, status)`. Errors follow `{ "error": "message" }`.
- **Validation**: use `zValidator("json", schema)` as middleware — the handler can then call `c.req.valid("json")` safely.
- **Passwords**: users authenticate with a 4-digit PIN. Hash with `hashPassword`, verify with `verifyPassword` (both in `src/lib/password.ts`). Never store plaintext.
- **Crypto**: only Web Crypto API is available (`crypto.subtle`). No `bcrypt`, no Node `crypto` module.
- **Adding a new route file**: create in `src/routes/`, export a `Hono` sub-app typed `Hono<{ Bindings: CloudflareBindings }>`, then `app.route("/path", handler)` in `src/index.tsx`.

## Adding Cloudflare bindings (KV, R2, etc.)

1. Add the binding in `wrangler.jsonc`
2. Run `bun run cf-typegen` to update `worker-configuration.d.ts`
3. Access it via `c.env.<BINDING_NAME>` — it's already typed

## What's next (planned, not yet built)

- `POST /auth/login` — verify PIN, issue JWT / session token
- `POST /auth/refresh` — token refresh
- Onboarding flow endpoints (step progression, band score submission)
- GraphQL layer (`graphql` package is installed, not wired up yet)
