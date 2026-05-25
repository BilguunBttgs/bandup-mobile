# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start local dev server (Vite + Miniflare)
bun run build        # Build for production
bun run deploy       # Build and deploy to Cloudflare Workers
bun run cf-typegen   # Regenerate CloudflareBindings types from wrangler config
```

## Architecture

This is a **Cloudflare Workers** backend built with **Hono** and served via **Vite**. The stack:

- **Runtime**: Cloudflare Workers (via `wrangler`, `workerd`)
- **Framework**: [Hono](https://hono.dev/) — lightweight edge-first web framework
- **Bundler**: Vite with `@cloudflare/vite-plugin` (replaces running wrangler directly for dev)
- **SSR**: `vite-ssr-components/hono` — injects Vite HMR client and asset links into server-rendered HTML
- **JSX**: Hono's built-in JSX (`jsxImportSource: "hono/jsx"`) — not React; render happens on the Worker, not in the browser
- **GraphQL**: `graphql` package is installed but not yet wired up

### Entry points

| File | Role |
|---|---|
| `src/index.tsx` | Hono app definition; registers middleware and routes |
| `src/renderer.tsx` | JSX layout wrapper using `jsxRenderer` — wraps all `c.render()` calls |
| `src/style.css` | Global stylesheet injected by the renderer |
| `wrangler.jsonc` | Cloudflare Workers config (name, compatibility date, main entry) |
| `vite.config.ts` | Vite config — loads `cloudflare()` and `ssrPlugin()` plugins |

### Request flow

```
Cloudflare Edge → Hono app (src/index.tsx)
                    ↓ app.use(renderer)          ← wraps every response in HTML shell
                    ↓ route handler → c.render() ← returns JSX injected into shell
```

### Adding Cloudflare bindings (KV, D1, R2, etc.)

1. Add the binding in `wrangler.jsonc`
2. Run `bun run cf-typegen` to update `worker-configuration.d.ts`
3. Type the Hono app: `new Hono<{ Bindings: CloudflareBindings }>()`
