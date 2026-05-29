"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, clearAuth, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (!_hasHydrated) return
    if (!token || !user) {
      router.replace("/auth")
      return
    }
    if (user.isOnboarding) {
      router.replace("/onboarding")
    }
  }, [_hasHydrated, token, user, router])

  if (!_hasHydrated || !token || !user || user.isOnboarding) return null

  function handleSignOut() {
    clearAuth()
    router.replace("/auth")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome back, {user.username}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  )
}
