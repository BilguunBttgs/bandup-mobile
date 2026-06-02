"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"
import { authApi } from "@/lib/auth-api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────

type Msg = {
  id: string
  from: "bilguun" | "user"
  text: string
}

type Phase = "init" | "letsgo" | "band" | "goal" | "level" | "done"

// ── Constants ──────────────────────────────────────────────────────────────

const BAND_CHOICES = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0]

const GOAL_CHOICES = [
  { label: "10 min / day", value: 10 },
  { label: "20 min / day", value: 20 },
  { label: "30 min / day", value: 30 },
  { label: "45 min / day", value: 45 },
  { label: "60 min / day", value: 60 },
]

const SKILLS = [
  { key: "reading", label: "Reading" },
  { key: "listening", label: "Listening" },
  { key: "writing", label: "Writing" },
  { key: "speaking", label: "Speaking" },
] as const

type SkillKey = (typeof SKILLS)[number]["key"]

// Self-rated level → IELTS band (0–9, 0.5 steps)
const LEVEL_CHOICES = [
  { label: "Beginner", band: 4.0 },
  { label: "Elementary", band: 5.0 },
  { label: "Intermediate", band: 6.0 },
  { label: "Advanced", band: 7.0 },
  { label: "Expert", band: 8.0 },
]

// ── Avatar ─────────────────────────────────────────────────────────────────

function BAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
        size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"
      )}
    >
      B
    </div>
  )
}

// ── Typing dots ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-end gap-2">
      <BAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-300ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  )
}

// ── Message bubbles ────────────────────────────────────────────────────────

function BilguunMsg({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <BAvatar />
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
        {text}
      </div>
    </div>
  )
}

function UserMsg({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {text}
      </div>
    </div>
  )
}

// ── Skill self-rating card ───────────────────────────────────────────────────

type SkillRatings = Record<SkillKey, number>

function SkillRatingCard({
  onSubmit,
}: {
  onSubmit: (data: SkillRatings) => Promise<void>
}) {
  const [ratings, setRatings] = useState<Partial<SkillRatings>>({})
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const allRated = SKILLS.every((s) => ratings[s.key] !== undefined)

  async function handleSubmit() {
    if (!allRated) {
      setSubmitError("Please rate every skill.")
      return
    }
    setSubmitError("")
    setSubmitting(true)
    try {
      await onSubmit(ratings as SkillRatings)
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Something went wrong"
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {SKILLS.map((skill) => (
        <div key={skill.key} className="space-y-1.5">
          <p className="text-xs font-medium">{skill.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {LEVEL_CHOICES.map((lvl) => (
              <button
                key={lvl.label}
                type="button"
                onClick={() =>
                  setRatings((p) => ({ ...p, [skill.key]: lvl.band }))
                }
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                  ratings[skill.key] === lvl.band
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/50"
                )}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {submitError && <p className="text-xs text-destructive">{submitError}</p>}

      <Button
        size="sm"
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Saving…" : "Save my level"}
      </Button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { token, user, updateUser, clearAuth, _hasHydrated } = useAuthStore()

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [phase, setPhase] = useState<Phase>("init")
  const [isTyping, setIsTyping] = useState(false)
  const [finishSubmitting, setFinishSubmitting] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const initialStep = useRef(0)

  // ── Helpers ───────────────────────────────────────────────────────────────

  function addMsg(msg: Msg) {
    setMsgs((prev) => [...prev, msg])
  }

  async function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms))
  }

  async function bilguunSays(id: string, text: string, typingMs = 800) {
    setIsTyping(true)
    await sleep(typingMs)
    setIsTyping(false)
    addMsg({ id, from: "bilguun", text })
  }

  async function advance(stepIndex: number, data?: unknown) {
    if (!token) return
    const res = await authApi.onboardingStep(token, stepIndex, data)
    const nextStep = res.nextStep ?? stepIndex + 1
    updateUser({ onboardingStep: nextStep })
  }

  // ── Conversation flow ─────────────────────────────────────────────────────

  async function runFromStep(step: number) {
    if (step === 0) {
      await bilguunSays("band_q", "What's your target IELTS band score?", 700)
      setPhase("band")
    } else if (step === 1) {
      await bilguunSays("goal_q", "How much time can you study each day?", 700)
      setPhase("goal")
    } else if (step === 2) {
      await bilguunSays(
        "level_q",
        "Last step — how would you rate your current English level?",
        700
      )
      setPhase("level")
    }
  }

  async function runIntro(startStep: number) {
    if (startStep >= 3) {
      await bilguunSays(
        "done_msg",
        "You're all set! 🎓 Your learning path is ready.",
        600
      )
      setPhase("done")
      return
    }
    await bilguunSays("intro1", "Hey there! I'm Bilguun 👋", 600)
    await bilguunSays(
      "intro2",
      "I'll be your English teacher. Mind if I ask a few quick questions to set up your dashboard?",
      1000
    )
    setPhase("letsgo")
  }

  async function handleLetsGo() {
    addMsg({ id: "u_letsgo", from: "user", text: "Let's go!" })
    setPhase("init")
    await runFromStep(initialStep.current)
  }

  async function handleBandSelect(band: number) {
    addMsg({ id: "u_band", from: "user", text: `Band ${band.toFixed(1)}` })
    setPhase("init")
    try {
      await advance(0, { target_band: band })
      initialStep.current = 1
      await bilguunSays(
        "goal_q",
        "Nice choice! How much time can you study each day?",
        800
      )
      setPhase("goal")
    } catch {
      setPhase("band")
    }
  }

  async function handleGoalSelect(minutes: number) {
    addMsg({ id: "u_goal", from: "user", text: `${minutes} min / day` })
    setPhase("init")
    try {
      await advance(1, { daily_goal_minutes: minutes })
      initialStep.current = 2
      await bilguunSays(
        "level_q",
        "Perfect! Last step — how would you rate your current English level?",
        800
      )
      setPhase("level")
    } catch {
      setPhase("goal")
    }
  }

  async function handleLevelDone(data: SkillRatings) {
    setPhase("init")
    try {
      await advance(2, data)
      await bilguunSays(
        "done_msg",
        "You're all set! 🎓 Your personalized learning path is ready.",
        800
      )
      setPhase("done")
    } catch {
      setPhase("level")
    }
  }

  async function handleFinish() {
    setFinishSubmitting(true)
    try {
      await advance(3)
      updateUser({ isOnboarding: false })
      router.replace("/")
    } catch {
      setFinishSubmitting(false)
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  // Scroll to bottom after every state change
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [msgs, isTyping, phase])

  // Auth guard
  useEffect(() => {
    if (!_hasHydrated) return
    if (!token || !user) {
      router.replace("/auth")
      return
    }
    if (!user.isOnboarding) router.replace("/")
  }, [_hasHydrated, token, user, router])

  // Kick off chat once auth is ready
  useEffect(() => {
    if (!_hasHydrated || !token || !user) return
    if (initialized.current) return
    initialized.current = true
    initialStep.current = user.onboardingStep
    runIntro(user.onboardingStep)
  }, [_hasHydrated, token, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────

  if (!_hasHydrated || !token || !user) return null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => {
            clearAuth()
            router.replace("/auth")
          }}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </button>

        <BAvatar size="md" />

        <div>
          <p className="text-sm font-semibold">Bilguun</p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <p className="text-xs text-muted-foreground">
              Your English teacher
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-5"
      >
        {msgs.map((m) =>
          m.from === "bilguun" ? (
            <BilguunMsg key={m.id} text={m.text} />
          ) : (
            <UserMsg key={m.id} text={m.text} />
          )
        )}

        {isTyping && <TypingDots />}

        {/* Skill self-rating card renders inline in the conversation */}
        {phase === "level" && (
          <div className="flex items-start gap-2">
            <BAvatar />
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted p-4">
              <SkillRatingCard onSubmit={handleLevelDone} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom input area */}
      <div className="border-t bg-card px-4 py-4">
        {phase === "letsgo" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleLetsGo}
              className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
            >
              Let&apos;s go 🚀
            </button>
          </div>
        )}

        {phase === "band" && (
          <div className="flex flex-wrap justify-end gap-2">
            {BAND_CHOICES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => handleBandSelect(b)}
                className="rounded-full border border-primary px-4 py-1.5 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Band {b.toFixed(1)}
              </button>
            ))}
          </div>
        )}

        {phase === "goal" && (
          <div className="flex flex-wrap justify-end gap-2">
            {GOAL_CHOICES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => handleGoalSelect(g.value)}
                className="rounded-full border border-primary px-4 py-1.5 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {phase === "done" && (
          <Button
            className="w-full"
            onClick={handleFinish}
            disabled={finishSubmitting}
          >
            {finishSubmitting ? "Starting…" : "Start learning"}
          </Button>
        )}
      </div>
    </div>
  )
}
