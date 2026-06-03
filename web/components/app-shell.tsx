"use client"

import { usePathname } from "next/navigation"

import { AppHeader } from "@/components/app-header"

// Routes that should NOT show the global header: the auth/onboarding flow, and
// the immersive reading exercise/results screens (which carry their own
// back-button + timer header).
function shouldHideHeader(pathname: string) {
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/get-started") ||
    pathname.startsWith("/onboarding")
  ) {
    return true
  }
  // /reading/<id> (exercise + results) — but not the /reading list itself
  return /^\/reading\/[^/]+$/.test(pathname)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideHeader = shouldHideHeader(pathname)

  return (
    <>
      {!hideHeader && <AppHeader />}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  )
}
