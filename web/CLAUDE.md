# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

This is the `web` package inside the `bandup-mobile` monorepo (siblings: `bandup-app`, `bandup-server`). It is a Next.js 16 + React 19 frontend bootstrapped from a shadcn/ui template.

> **Important:** This uses Next.js 16, which has breaking changes from earlier versions. Before writing any Next.js-specific code, consult `node_modules/next/dist/docs/` for the authoritative API and conventions.

## Commands

```bash
npm run dev        # start dev server (localhost:3000)
npm run build      # production build
npm run lint       # ESLint (next core-web-vitals + TypeScript rules)
npm run typecheck  # tsc --noEmit
npm run format     # Prettier write (all .ts/.tsx)
```

There are no tests configured yet.

## Architecture

- **App Router** (`app/`) — Next.js App Router layout. Root layout wraps everything in `ThemeProvider`.
- **Components** (`components/`) — General components go here. shadcn UI primitives are placed under `components/ui/` and generated via `npx shadcn@latest add <component>`.
- **Lib** (`lib/`) — Shared utilities. `lib/utils.ts` exports `cn()` (clsx + tailwind-merge).
- **Hooks** (`hooks/`) — Custom React hooks.
- **Path alias** — `@/` resolves to the project root (e.g. `@/components/ui/button`).

## Styling

- Tailwind CSS v4 — configured entirely via CSS (`app/globals.css`), no `tailwind.config.*` file.
- CSS custom properties drive the design token system; dark mode is class-based (`.dark`).
- Use `cn()` from `@/lib/utils` for conditional class merging.
- Prettier auto-sorts Tailwind classes on format (via `prettier-plugin-tailwindcss`). Always run `npm run format` after editing JSX.

## shadcn/ui configuration

- Style: `radix-luma`, base color: `mist`, icons: `@phosphor-icons/react`
- To add a new component: `npx shadcn@latest add <component>`

## Code style (Prettier)

- No semicolons, double quotes, 2-space indent, trailing commas (`es5`), 80-char line width.

## Theming

Dark/light mode via `next-themes` (class strategy). `ThemeProvider` in `components/theme-provider.tsx` wires up the `d` hotkey to toggle the theme.
