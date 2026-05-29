"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuthStore } from "@/store/auth"
import { authApi, type ReadingDetail } from "@/lib/auth-api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Step progress bar ──────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= current ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </div>
  )
}

// ── Step 0: Target band ────────────────────────────────────────────────────

const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) =>
  (i * 0.5).toFixed(1)
)

const bandSchema = z.object({
  target_band: z.string().min(1, "Select a band score"),
})

function BandStep({
  onNext,
}: {
  onNext: (data: { target_band: number }) => Promise<void>
}) {
  const [error, setError] = useState("")
  const { register, handleSubmit, setValue, formState } =
    useForm<{ target_band: string }>({
      resolver: zodResolver(bandSchema),
      defaultValues: { target_band: "6.5" },
    })

  async function onSubmit(values: { target_band: string }) {
    setError("")
    try {
      await onNext({ target_band: parseFloat(values.target_band) })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          What&apos;s your target IELTS band score?
        </h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll tailor your learning path to help you reach it.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Target band</Label>
        <Select
          defaultValue="6.5"
          onValueChange={(v) => setValue("target_band", v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select band" />
          </SelectTrigger>
          <SelectContent>
            {BAND_OPTIONS.map((band) => (
              <SelectItem key={band} value={band}>
                Band {band}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" {...register("target_band")} />
        {formState.errors.target_band && (
          <p className="text-xs text-destructive">
            {formState.errors.target_band.message}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={formState.isSubmitting}
      >
        {formState.isSubmitting ? "Saving…" : "Continue"}
      </Button>
    </form>
  )
}

// ── Step 1: Daily goal ─────────────────────────────────────────────────────

const goalSchema = z.object({
  daily_goal_minutes: z
    .number()
    .int()
    .min(5, "At least 5 minutes")
    .max(480, "At most 480 minutes"),
})

type GoalValues = z.infer<typeof goalSchema>

function GoalStep({
  onNext,
}: {
  onNext: (data: { daily_goal_minutes: number }) => Promise<void>
}) {
  const [error, setError] = useState("")
  const { register, handleSubmit, formState } = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { daily_goal_minutes: 30 },
  })

  async function onSubmit(values: GoalValues) {
    setError("")
    try {
      await onNext(values)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">How much can you study daily?</h2>
        <p className="text-sm text-muted-foreground">
          Even 10 minutes a day adds up fast.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal">Daily goal (minutes)</Label>
        <Input
          id="goal"
          type="number"
          inputMode="numeric"
          min={5}
          max={480}
          {...register("daily_goal_minutes", { valueAsNumber: true })}
        />
        {formState.errors.daily_goal_minutes && (
          <p className="text-xs text-destructive">
            {formState.errors.daily_goal_minutes.message}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={formState.isSubmitting}
      >
        {formState.isSubmitting ? "Saving…" : "Continue"}
      </Button>
    </form>
  )
}

// ── Step 2: Placement reading test ─────────────────────────────────────────

function PlacementStep({
  token,
  onNext,
}: {
  token: string
  onNext: (data: {
    reading_id: number
    answers: { question_id: number; option_id: number }[]
  }) => Promise<void>
}) {
  const [reading, setReading] = useState<ReadingDetail | null>(null)
  const [loadError, setLoadError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const fetched = useRef(false)

  const loadReading = useCallback(async () => {
    try {
      const list = await authApi.getReadings(token, "easy")
      if (list.length === 0) {
        setLoadError("No placement readings available. Please contact support.")
        return
      }
      const detail = await authApi.getReading(token, list[0].id)
      setReading(detail)
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load reading"
      )
    }
  }, [token])

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    loadReading()
  }, [loadReading])

  async function handleSubmit() {
    if (!reading) return
    const answered = reading.questions.map((q) => answers[q.id])
    if (answered.some((v) => v === undefined)) {
      setSubmitError("Please answer all questions before submitting.")
      return
    }

    setSubmitError("")
    setSubmitting(true)
    try {
      await onNext({
        reading_id: reading.id,
        answers: reading.questions.map((q) => ({
          question_id: q.id,
          option_id: answers[q.id],
        })),
      })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => { fetched.current = false; loadReading() }}>
          Retry
        </Button>
      </div>
    )
  }

  if (!reading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Placement reading test</h2>
        <p className="text-sm text-muted-foreground">Loading your test…</p>
        <div className="h-2 w-32 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Placement reading test</h2>
        <p className="text-sm text-muted-foreground">
          Read the passage and answer the questions to assess your level.
        </p>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
        {reading.passage}
      </div>

      <div className="space-y-5">
        {reading.questions
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((q, qi) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium">
                {qi + 1}. {q.text}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                    }
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      answers[q.id] === opt.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <span className="mt-px shrink-0 font-mono text-xs font-medium">
                      {opt.label}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  )
}

// ── Step 3: Complete ───────────────────────────────────────────────────────

function CompleteStep({
  onFinish,
  submitting,
}: {
  onFinish: () => Promise<void>
  submitting: boolean
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
          🎓
        </div>
        <h2 className="text-lg font-semibold">You&apos;re all set!</h2>
        <p className="text-sm text-muted-foreground">
          Your characters, quests, and learning path are ready. Time to improve
          your band score.
        </p>
      </div>

      <Button className="w-full" onClick={onFinish} disabled={submitting}>
        {submitting ? "Starting…" : "Start learning"}
      </Button>
    </div>
  )
}

// ── Main onboarding page ───────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { token, user, updateUser, clearAuth, _hasHydrated } = useAuthStore()
  const [finishSubmitting, setFinishSubmitting] = useState(false)

  useEffect(() => {
    if (!_hasHydrated) return
    if (!token || !user) {
      router.replace("/auth")
      return
    }
    if (!user.isOnboarding) {
      router.replace("/")
    }
  }, [_hasHydrated, token, user, router])

  async function advance(stepIndex: number, data?: unknown) {
    if (!token) return
    const res = await authApi.onboardingStep(token, stepIndex, data)
    const nextStep = res.nextStep ?? stepIndex + 1
    updateUser({ onboardingStep: nextStep })
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

  if (!_hasHydrated || !token || !user) return null

  const step = user.onboardingStep

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Step {step + 1} of 4
          </p>
          <StepBar current={step} total={4} />
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === 0 && (
              <BandStep
                onNext={(data) => advance(0, data)}
              />
            )}
            {step === 1 && (
              <GoalStep
                onNext={(data) => advance(1, data)}
              />
            )}
            {step === 2 && (
              <PlacementStep
                token={token}
                onNext={(data) => advance(2, data)}
              />
            )}
            {step === 3 && (
              <CompleteStep
                onFinish={handleFinish}
                submitting={finishSubmitting}
              />
            )}
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => { clearAuth(); router.replace("/auth") }}
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
