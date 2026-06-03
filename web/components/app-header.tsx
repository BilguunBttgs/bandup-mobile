"use client"

import { useEffect, useState } from "react"
import { Coins, Fire, Lightning, type Icon } from "@phosphor-icons/react"

import { useAuthStore } from "@/store/auth"
import { gameApi, type GameStats } from "@/lib/game-api"

function StatChip({
  icon: IconCmp,
  value,
  color,
}: {
  icon: Icon
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-1">
      <IconCmp size={18} weight="fill" className={color} />
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

// Global app header: BANDUP wordmark on the left, live XP / coins / streak on
// the right. Rendered on every page except the auth flow (see AppShell).
export function AppHeader() {
  const { token, user } = useAuthStore()
  const [stats, setStats] = useState<GameStats | null>(null)

  useEffect(() => {
    if (!token || !user || user.isOnboarding) return
    let cancelled = false
    gameApi
      .getState(token)
      .then((res) => {
        if (!cancelled) setStats(res.stats)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token, user])

  return (
    <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
      <span className="text-base font-extrabold tracking-tight">
        BAND<span className="text-primary">UP</span>
      </span>

      <div className="flex items-center gap-4">
        <StatChip
          icon={Lightning}
          value={stats?.totalXp ?? 0}
          color="text-violet-500"
        />
        <StatChip
          icon={Coins}
          value={stats?.coins ?? 0}
          color="text-amber-500"
        />
        <StatChip
          icon={Fire}
          value={stats?.streakDays ?? 0}
          color="text-orange-500"
        />
      </div>
    </header>
  )
}
