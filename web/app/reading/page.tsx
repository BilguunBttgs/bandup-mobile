"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ListChecks,
} from "@phosphor-icons/react"
import { useAuthStore } from "@/store/auth"
import { authApi, type ReadingSummary } from "@/lib/auth-api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { BottomNav } from "@/components/bottom-nav"

const LEVEL_STYLES: Record<string, string> = {
  easy: "bg-green-500/15 text-green-600",
  medium: "bg-amber-500/15 text-amber-600",
  hard: "bg-red-500/15 text-red-600",
}

function formatMinutes(seconds: number) {
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

export default function ReadingListPage() {
  const router = useRouter()
  const { token, user, _hasHydrated } = useAuthStore()

  const [readings, setReadings] = useState<ReadingSummary[] | null>(null)
  const [error, setError] = useState("")

  // Auth guard
  useEffect(() => {
    if (!_hasHydrated) return
    if (!token || !user) {
      router.replace("/get-started")
      return
    }
    if (user.isOnboarding) router.replace("/onboarding")
  }, [_hasHydrated, token, user, router])

  // Fetch readings
  useEffect(() => {
    if (!token || !user || user.isOnboarding) return
    let cancelled = false
    authApi
      .getReadings(token)
      .then((res) => {
        if (!cancelled) setReadings(res)
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

  return (
    <div className="flex h-full flex-col">
      {/* Sub-header with back-to-home */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">Reading</h1>
      </div>

      {/* List */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : readings === null ? (
          <p className="text-sm text-muted-foreground">Loading readings…</p>
        ) : readings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No readings available yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {readings.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/reading/${r.id}`)}
                  className="w-full rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {r.completed && (
                        <CheckCircle
                          size={18}
                          weight="fill"
                          className="shrink-0 text-green-500"
                        />
                      )}
                      <p className="min-w-0 truncate font-medium">{r.title}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                        LEVEL_STYLES[r.level] ??
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {r.level}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ListChecks size={14} />
                      {r.questionCount} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatMinutes(r.timerSeconds)}
                    </span>
                    {r.completed && r.bestBandScore != null && (
                      <span className="ml-auto flex items-center gap-1 font-semibold text-green-600">
                        Band {r.bestBandScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
