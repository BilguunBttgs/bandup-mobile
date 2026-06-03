"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useAuthStore } from "@/store/auth"
import { gameApi, type GameState } from "@/lib/game-api"
import { ApiError } from "@/lib/api"
import { BottomNav } from "@/components/bottom-nav"
import { QuestsSection } from "@/components/quests-section"

export default function QuestsPage() {
  const router = useRouter()
  const { token, user, _hasHydrated } = useAuthStore()

  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState("")

  // Auth + onboarding guard
  useEffect(() => {
    if (!_hasHydrated) return
    if (!token || !user) {
      router.replace("/get-started")
      return
    }
    if (user.isOnboarding) router.replace("/onboarding")
  }, [_hasHydrated, token, user, router])

  // Fetch player state
  useEffect(() => {
    if (!token || !user || user.isOnboarding) return
    let cancelled = false
    gameApi
      .getState(token)
      .then((res) => {
        if (!cancelled) setState(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load")
        }
      })
    return () => {
      cancelled = true
    }
  }, [token, user])

  if (!_hasHydrated || !token || !user || user.isOnboarding) return null

  const hasQuests = state && state.quests.length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <h1 className="mb-5 text-xl font-semibold">Quests</h1>
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : hasQuests ? (
          <QuestsSection quests={state.quests} />
        ) : (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No active quests right now. Check back soon!
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
