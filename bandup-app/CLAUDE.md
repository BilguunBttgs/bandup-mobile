@AGENTS.md

# BandUp — Mobile App

## What this project is

**BandUp** is an IELTS preparation app for learners who want to track and improve their band scores. The mobile app is the user-facing side; the backend lives at `../bandup-server/` (see its own CLAUDE.md for full server docs).

**Core loop (current + planned):**
1. User signs up / signs in with a 4-digit PIN
2. Onboarding collects their current self-assessed band scores
3. They practice reading passages (easy → medium → hard) with timed quizzes
4. Each submission is auto-scored and their best band score is persisted
5. A dashboard will show score progression over time

---

## Commands

```bash
npm install          # Install dependencies (also re-applies patches via postinstall)
npx expo start       # Start Metro bundler (scan QR with Expo Go)
npx expo start --clear  # Start with cleared cache — required after config changes
npx expo start --android
npx expo start --ios
npx expo start --web
```

---

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| Framework | Expo SDK 56 + React Native 0.85 | |
| Routing | Expo Router v4 (file-based) | Entry: `expo-router/entry`; screens live in `src/app/` |
| Styling | NativeWind v4 + Tailwind CSS v3 | `className` on RN components; see Styling section below |
| Theme | Custom `useTheme()` hook | Light/dark, no external library |
| State | Zustand | Auth store lives in `src/stores/auth-store.ts` |
| Secure storage | `expo-secure-store` (native) / `localStorage` (web) | JWT persisted under key `bandup_token` |
| Platforms | iOS, Android, Web | Web via Metro static bundler |
| Backend | `../bandup-server/` | Cloudflare Workers + Hono; REST API |

---

## File structure

```
src/
├── app/
│   ├── _layout.tsx            # Root layout — reads stored token, redirects to (auth) or (app)
│   ├── (auth)/
│   │   ├── _layout.tsx        # Auth stack (slide_from_right animation, no header)
│   │   ├── index.tsx          # Welcome / landing screen (mascot, CTA buttons)
│   │   ├── signin.tsx         # Sign-in screen (email/username + PIN)
│   │   └── signup.tsx         # Sign-up screen (username + email + PIN)
│   └── (app)/
│       ├── _layout.tsx        # App layout — ThemeProvider + AnimatedSplashOverlay + AppTabs
│       ├── index.tsx          # Home tab (placeholder → will become dashboard)
│       └── explore.tsx        # Explore tab (placeholder)
├── components/
│   ├── pin-input.tsx          # <PinInput> — 4-dot PIN input with hidden TextInput
│   ├── themed-text.tsx        # <ThemedText> — themed RN Text with type variants
│   ├── themed-view.tsx        # <ThemedView> — themed RN View with type variants
│   ├── animated-icon.tsx      # Splash overlay animation (native)
│   ├── animated-icon.web.tsx  # Same for web
│   ├── app-tabs.tsx           # Bottom tab navigator (native)
│   ├── app-tabs.web.tsx       # Top nav for web
│   ├── external-link.tsx      # Link that opens in the browser
│   ├── hint-row.tsx           # Key-value row used on the home screen
│   ├── web-badge.tsx          # "Open in Expo Go" badge (web only)
│   └── ui/
│       └── collapsible.tsx    # Animated expand/collapse using Reanimated
├── constants/
│   └── theme.ts               # Colors, Fonts, Spacing scale, BottomTabInset, MaxContentWidth
├── hooks/
│   ├── use-color-scheme.ts      # Native color scheme hook
│   ├── use-color-scheme.web.ts  # Web override
│   └── use-theme.ts             # Returns the correct Colors.light/dark object
├── lib/
│   └── api.ts                 # Typed fetch wrapper + auth API calls (signup, signin)
├── stores/
│   └── auth-store.ts          # Zustand auth store (token, user, hydrate, signup, signin, signout)
└── global.css                 # @tailwind base/components/utilities + CSS custom properties

patches/
└── react-native-css-interop+0.2.4.patch  # See "Known issues" below

tailwind.config.js   # content: ["./src/**/*.{js,jsx,ts,tsx}"]
metro.config.js      # withNativeWind({ input: "./src/global.css" })
babel.config.js      # babel-preset-expo with jsxImportSource: "nativewind"
```

---

## Auth flow

The root layout (`src/app/_layout.tsx`) gates routing:

1. On mount, calls `useAuthStore().hydrate()` to read the stored JWT from SecureStore/localStorage.
2. Until hydrated, renders `null` (blank screen — avoids flash of wrong route).
3. Once hydrated, watches `token` + `segments`:
   - No token + not in `(auth)` → `router.replace('/(auth)')`
   - Token present + in `(auth)` → `router.replace('/(app)')`
4. Signup auto-signs-in after account creation so the user never sees a second prompt.

---

## Styling

The app uses **two systems side by side**; understand when to use each:

### Design tokens (brand palette)

| Token | Value | Usage |
|---|---|---|
| Brand primary | `#C44D30` | Buttons, active borders, dots |
| Background | `#F5EEE6` | Screen backgrounds |
| Text primary | `#1C1209` | Headlines |
| Text secondary | `#9B8A7A` | Subtitles, hints |
| Text tertiary | `#6B5540` | Labels, field captions |
| Input border inactive | `#E5D9D0` | Unfocused TextInput border |
| Input fill | `white` | TextInput background |

### NativeWind (`className`)
Tailwind utility classes applied directly to React Native components. Works on any component that passes `className` through (all built-in RN components do after the Babel transform).

```tsx
<View className="flex-1 bg-white dark:bg-black px-6" />
<Text className="text-green-500 font-bold text-lg" />
```

Use for: layout, spacing, typography, one-off colours, dark mode variants.

### `StyleSheet.create` (legacy / complex styles)
Still used in existing components for dynamic values and platform-specific styles.

```tsx
const styles = StyleSheet.create({ container: { flex: 1 } });
<View style={styles.container} />
```

Use for: styles that depend on JS values at runtime (e.g. `safeAreaInsets.bottom + Spacing.three`).

### Theming primitives (`src/constants/theme.ts`)

| Export | Purpose |
|---|---|
| `Colors.light` / `Colors.dark` | Token map: `text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary` |
| `useTheme()` | Returns the active `Colors.light` or `Colors.dark` object |
| `Spacing` | `{ half:2, one:4, two:8, three:16, four:24, five:32, six:64 }` |
| `Fonts` | Platform-selected font stacks (system-ui, serif, mono, rounded) |
| `BottomTabInset` | Extra bottom padding for the floating tab bar (iOS: 50, Android: 80) |
| `MaxContentWidth` | `800` — constrain content width on wide screens/web |

### `ThemedText` type variants

```
default    16px / 500w
title      48px / 600w
subtitle   32px / 600w
small      14px / 500w
smallBold  14px / 700w
link       14px
linkPrimary  14px / #3c87f7
code       monospace / 12px
```

### `ThemedView` type variants
`default` (transparent) | `background` | `backgroundElement`

---

## Adding a new screen

1. Create `src/app/(app)/<name>.tsx` for authenticated screens, or `src/app/(auth)/<name>.tsx` for pre-auth screens
2. Export a default React component
3. Expo Router picks it up automatically — no manifest needed
4. Add a tab entry in `src/components/app-tabs.tsx` if it should appear in the tab bar

---

## Connecting to the backend

Base URL: configured via `EXPO_PUBLIC_API_URL` env var (falls back to `http://localhost:5173`).

All authenticated routes require `Authorization: Bearer <token>`.
The token comes from `POST /auth/signin` → `{ token, user }` and is managed by `useAuthStore`.

Use `src/lib/api.ts` for all API calls — it handles headers, error parsing, and non-JSON responses.

### Key API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | ✗ | Create account (username, email, 4-digit PIN); returns `User` |
| POST | `/auth/signin` | ✗ | Sign in with email or username + PIN; returns `{ token, user }` |
| GET | `/reading?level=easy\|medium\|hard` | ✓ | List readings (no passage) |
| GET | `/reading/:id` | ✓ | Full reading + questions + options (no answers) |
| POST | `/reading/:id/submit` | ✓ | Submit answers; returns band score + per-answer feedback |

---

## Key components

### `<PinInput>` (`src/components/pin-input.tsx`)
A 4-dot PIN input row. Tapping anywhere focuses a hidden `TextInput`; each filled digit renders as a filled dot inside a rounded box. Props: `value`, `onChange`, `length` (default `4`).

---

## Known issues & patches

### NativeWind HMR crash on Expo SDK 56 / Metro 0.84

**Symptom:** Metro crashes with a stack trace through `DependencyGraph._onHasteChange` when a file with `className` is saved.

**Cause:** `react-native-css-interop@0.2.4` emits haste change events in the old Metro format (`{ eventsQueue: [...] }`), but Metro 0.84 (shipped with Expo 56) expects `{ changes: { addedFiles, modifiedFiles, removedFiles }, rootDir }`.

**Fix:** `patches/react-native-css-interop+0.2.4.patch` (applied automatically via `postinstall`). Do not delete this file. If you see the crash again after a fresh `npm install`, run `npm install` once more — `patch-package` runs on `postinstall`.

---

## Conventions

- **Path alias**: `@/` resolves to `src/` (configured in `tsconfig.json`)
- **Platform files**: `foo.web.tsx` overrides `foo.tsx` on web; `foo.native.tsx` for native-only
- **No default exports for components** — use named exports (exception: screen files in `src/app/` must use default exports for Expo Router)
- **Always `--clear` after config changes**: `npx expo start --clear` after touching `tailwind.config.js`, `metro.config.js`, or `babel.config.js`
- **Expo SDK 56 docs**: https://docs.expo.dev/versions/v56.0.0/ — always check versioned docs before using an Expo API
- **Env vars**: public vars must be prefixed `EXPO_PUBLIC_` to be bundled into the app

---

## What's built vs planned

| Feature | Status |
|---|---|
| App shell (tabs, theme, splash) | ✅ Done |
| NativeWind styling | ✅ Done (patched) |
| Auth screens (welcome, signup, signin) | ✅ Done |
| JWT storage + auth state (Zustand) | ✅ Done |
| Auth-gated routing (root layout redirect) | ✅ Done |
| Onboarding flow | 🔲 Not started |
| Reading list screen | 🔲 Not started |
| Reading detail + quiz screen | 🔲 Not started |
| Score dashboard / history | 🔲 Not started |
