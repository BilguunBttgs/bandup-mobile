"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  BookOpen,
  CheckCircle,
  Coins,
  Fire,
  Headphones,
  Lightning,
  Microphone,
  PencilSimple,
  SignOut,
  type Icon,
} from "@phosphor-icons/react"
import { useAuthStore } from "@/store/auth"
import { gameApi, type GameState, type Quest, type Skill } from "@/lib/game-api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Skill metadata ───────────────────────────────────────────────────────────

const SKILL_ORDER: Skill[] = ["reading", "listening", "writing", "speaking"]

const SKILL_META: Record<
  Skill,
  { label: string; Icon: Icon; image: string; accent: string; ring: string }
> = {
  reading: {
    label: "Reading",
    Icon: BookOpen,
    image: "/assets/reading.png",
    accent: "text-sky-500",
    ring: "ring-sky-500/30",
  },
  listening: {
    label: "Listening",
    Icon: Headphones,
    image: "/assets/listening.png",
    accent: "text-violet-500",
    ring: "ring-violet-500/30",
  },
  writing: {
    label: "Writing",
    Icon: PencilSimple,
    image: "/assets/writing.png",
    accent: "text-amber-500",
    ring: "ring-amber-500/30",
  },
  speaking: {
    label: "Speaking",
    Icon: Microphone,
    image: "/assets/speaking.png",
    accent: "text-rose-500",
    ring: "ring-rose-500/30",
  },
}

// ── Header stat chip ──────────────────────────────────────────────────────────

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

// ── Character card ────────────────────────────────────────────────────────────

function hpColor(hp: number) {
  if (hp >= 60) return "bg-green-500"
  if (hp >= 30) return "bg-amber-500"
  return "bg-red-500"
}

function CharacterCard({
  skill,
  hp,
  level,
  isAlive,
  bandScore,
  onClick,
}: {
  skill: Skill
  hp: number
  level: number
  isAlive: boolean
  bandScore: number | null
  onClick?: () => void
}) {
  const meta = SKILL_META[skill]
  const { Icon: SkillIcon } = meta

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition-colors",
        onClick && "hover:bg-muted/50 active:bg-muted",
        !onClick && "cursor-default",
        !isAlive && "opacity-60"
      )}
    >
      {/* Character avatar */}
      <div className="relative">
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted ring-4",
            meta.ring
          )}
        >
          <Image
            src={meta.image}
            alt={meta.label}
            width={72}
            height={72}
            className={cn("object-contain", !isAlive && "grayscale")}
          />
        </div>

        {/* Skill icon badge */}
        <div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-background">
          <SkillIcon size={15} weight="fill" className={meta.accent} />
        </div>

        {/* Level badge */}
        <div className="absolute -top-1 -left-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none font-bold text-primary-foreground">
          Lv {level}
        </div>
      </div>

      <p className="text-sm font-semibold">{meta.label}</p>

      {/* Band score */}
      <div className="flex items-baseline gap-1">
        <span className="text-[10px] text-muted-foreground">Band</span>
        <span className={cn("text-lg leading-none font-bold", meta.accent)}>
          {bandScore != null ? bandScore.toFixed(1) : "—"}
        </span>
      </div>

      {/* HP bar */}
      <div className="w-full">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{isAlive ? "HP" : "Fainted"}</span>
          <span className="tabular-nums">{hp}/100</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", hpColor(hp))}
            style={{ width: `${Math.max(0, Math.min(100, hp))}%` }}
          />
        </div>
      </div>
    </button>
  )
}

// ── Quest item ────────────────────────────────────────────────────────────────

function QuestItem({ quest }: { quest: Quest }) {
  const pct =
    quest.requiredCount > 0
      ? Math.min(100, (quest.progress / quest.requiredCount) * 100)
      : 0

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4",
        quest.isCompleted && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {quest.isCompleted && (
              <CheckCircle size={16} weight="fill" className="text-green-500" />
            )}
            {quest.titleMn}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {quest.descriptionMn}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-semibold">
          <span className="flex items-center gap-0.5 text-violet-500">
            <Lightning size={13} weight="fill" />+{quest.xpReward}
          </span>
          <span className="flex items-center gap-0.5 text-amber-500">
            <Coins size={13} weight="fill" />+{quest.coinReward}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">
            {quest.progress}/{quest.requiredCount}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              quest.isCompleted ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, clearAuth, _hasHydrated } = useAuthStore()

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

  const charBySkill = new Map(state?.characters.map((c) => [c.skill, c]))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <StatChip
            icon={Lightning}
            value={state?.stats.totalXp ?? 0}
            color="text-violet-500"
          />
          <StatChip
            icon={Coins}
            value={state?.stats.coins ?? 0}
            color="text-amber-500"
          />
          <StatChip
            icon={Fire}
            value={state?.stats.streakDays ?? 0}
            color="text-orange-500"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            clearAuth()
            router.replace("/get-started")
          }}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Sign out"
        >
          <SignOut size={20} />
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-semibold">Hi, {user.username} 👋</h1>
          <p className="text-sm text-muted-foreground">
            Your characters are ready to train.
          </p>
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {SKILL_ORDER.map((skill) => {
              const ch = charBySkill.get(skill)
              return (
                <CharacterCard
                  key={skill}
                  skill={skill}
                  hp={ch?.hp ?? 100}
                  level={ch?.level ?? 1}
                  isAlive={ch?.isAlive ?? true}
                  bandScore={ch?.bandScore ?? null}
                  onClick={
                    skill === "reading"
                      ? () => router.push("/reading")
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}

        {/* Active quests */}
        {state && state.quests.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">Active quests</h2>
            <div className="space-y-3">
              {state.quests.map((q) => (
                <QuestItem key={q.id} quest={q} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
