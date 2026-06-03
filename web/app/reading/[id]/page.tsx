"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  CaretUp,
  CheckCircle,
  Clock,
  Coins,
  Lightning,
  PaperPlaneTilt,
  Trophy,
  XCircle,
} from "@phosphor-icons/react"
import { useAuthStore } from "@/store/auth"
import {
  authApi,
  type ReadingDetail,
  type ReadingSubmitResult,
} from "@/lib/auth-api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function ReadingExercisePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const readingId = Number(params.id)
  const { token, user, _hasHydrated } = useAuthStore()

  const [detail, setDetail] = useState<ReadingDetail | null>(null)
  const [error, setError] = useState("")

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [passageOpen, setPassageOpen] = useState(true)

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ReadingSubmitResult | null>(null)

  // Auth guard
  useEffect(() => {
    if (!_hasHydrated) return
    if (!token || !user) {
      router.replace("/get-started")
      return
    }
    if (user.isOnboarding) router.replace("/onboarding")
  }, [_hasHydrated, token, user, router])

  // Fetch the reading
  useEffect(() => {
    if (!token || !user || user.isOnboarding) return
    if (isNaN(readingId)) return
    let cancelled = false
    authApi
      .getReading(token, readingId)
      .then((res) => {
        if (cancelled) return
        setDetail(res)
        setSecondsLeft(res.timerSeconds)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load")
        }
      })
    return () => {
      cancelled = true
    }
  }, [token, user, readingId])

  // Submit (manual or on timeout). totalQuestions is validated server-side.
  const handleSubmit = useCallback(async () => {
    if (!token || !detail || submitting || result) return

    const answerList = Object.entries(answers).map(([qid, oid]) => ({
      question_id: Number(qid),
      option_id: oid,
    }))
    if (answerList.length === 0) {
      setError("Answer at least one question before submitting.")
      return
    }

    const timeTaken =
      secondsLeft != null
        ? Math.max(0, detail.timerSeconds - secondsLeft)
        : detail.timerSeconds

    setSubmitting(true)
    setError("")
    try {
      const res = await authApi.submitReading(token, detail.id, {
        answers: answerList,
        time_taken_seconds: timeTaken,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }, [token, detail, submitting, result, answers, secondsLeft])

  // Countdown timer. On the final tick we auto-submit (only if something was
  // answered) — done inside the async setTimeout callback rather than a
  // separate effect so we never call setState synchronously during render.
  useEffect(() => {
    if (secondsLeft == null || secondsLeft <= 0 || result || submitting) return
    const t = setTimeout(() => {
      if (secondsLeft <= 1) {
        setSecondsLeft(0)
        if (Object.keys(answers).length > 0) handleSubmit()
      } else {
        setSecondsLeft(secondsLeft - 1)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, result, submitting, answers, handleSubmit])

  if (!_hasHydrated || !token || !user || user.isOnboarding) return null

  // ── Loading / fatal error ───────────────────────────────────────────────────
  if (!detail) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/reading")}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold">Reading</h1>
        </header>
        <main className="flex-1 px-4 py-5">
          {error || isNaN(readingId) ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error || "Invalid reading."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Loading reading…</p>
          )}
        </main>
      </div>
    )
  }

  // ── Results view ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <ResultsView
        detail={detail}
        result={result}
        onBack={() => router.push("/reading")}
      />
    )
  }

  // ── Exercise view ────────────────────────────────────────────────────────────
  const total = detail.questions.length
  const question = detail.questions[current]
  const isLast = current === total - 1
  const lowTime = secondsLeft != null && secondsLeft <= 60

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/reading")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
          {detail.title}
        </h1>
        {secondsLeft != null && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold tabular-nums",
              lowTime
                ? "bg-red-500/15 text-red-600"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Clock size={14} weight="fill" />
            {formatClock(secondsLeft)}
          </span>
        )}
      </header>

      {/* Collapsible passage */}
      <section
        className={cn(
          "flex min-h-0 flex-col border-b bg-card",
          passageOpen && "flex-1"
        )}
      >
        <button
          type="button"
          onClick={() => setPassageOpen((o) => !o)}
          className="flex shrink-0 items-center justify-between px-4 py-2.5 text-left"
        >
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Passage
          </span>
          {passageOpen ? (
            <CaretUp size={16} className="text-muted-foreground" />
          ) : (
            <CaretDown size={16} className="text-muted-foreground" />
          )}
        </button>
        {passageOpen && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {detail.passage}
            </p>
          </div>
        )}
      </section>

      {/* Questions pinned at the bottom */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Question {current + 1} of {total}
          </p>
          <p className="mb-4 text-sm font-medium">{question.text}</p>

          <div className="space-y-2">
            {question.options.map((opt) => {
              const selected = answers[question.id] === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [question.id]: opt.id }))
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/10"
                      : "bg-card hover:bg-muted/50 active:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="min-w-0">{opt.text}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation footer */}
        <div className="shrink-0 border-t bg-card px-4 py-3">
          {error && (
            <p className="mb-2 text-center text-xs text-destructive">{error}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-40"
              aria-label="Previous question"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-1">
              {detail.questions.map((q, i) => (
                <span
                  key={q.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === current
                      ? "w-4 bg-primary"
                      : answers[q.id] != null
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            {isLast ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <PaperPlaneTilt size={16} weight="fill" />
                {submitting ? "Submitting…" : "Submit"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors hover:bg-muted/50 active:bg-muted"
                aria-label="Next question"
              >
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Results view ───────────────────────────────────────────────────────────────

function ResultsView({
  detail,
  result,
  onBack,
}: {
  detail: ReadingDetail
  result: ReadingSubmitResult
  onBack: () => void
}) {
  const [reviewOpen, setReviewOpen] = useState(false)

  const resultByQuestion = new Map(
    result.answers.map((a) => [a.question_id, a])
  )

  // Celebrate on mount — a single, modest burst.
  useEffect(() => {
    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 35,
      origin: { y: 0.7 },
    })
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <h1 className="text-base font-semibold">Results</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        {/* Celebration */}
        <div className="mb-5 flex justify-center">
          <Image
            src="/assets/congratz.png"
            alt="Congratulations!"
            width={220}
            height={220}
            priority
            className="h-auto w-44 object-contain"
          />
        </div>

        {/* Score summary */}
        <div className="rounded-2xl border bg-card p-5 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5 text-muted-foreground">
            <Trophy size={16} weight="fill" className="text-amber-500" />
            <span className="text-xs font-medium">Band score</span>
          </div>
          <p className="text-4xl font-bold text-primary">
            {result.band_score.toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.correct_count} / {result.total_questions} correct ·{" "}
            {formatClock(result.time_taken_seconds)}
          </p>

          <div className="mt-4 flex items-center justify-center gap-4 text-sm font-semibold">
            <span className="flex items-center gap-1 text-violet-500">
              <Lightning size={15} weight="fill" />+{result.xp_earned} XP
            </span>
            <span className="flex items-center gap-1 text-amber-500">
              <Coins size={15} weight="fill" />+{result.coins_earned}
            </span>
          </div>

          {result.rewards.leveled_up && (
            <p className="mt-3 text-xs font-semibold text-green-600">
              Reading reached level {result.rewards.skill_level}!
            </p>
          )}
        </div>

        {/* Completed quests */}
        {result.quests_completed.length > 0 && (
          <div className="mt-4 space-y-2">
            {result.quests_completed.map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm"
              >
                <CheckCircle
                  size={16}
                  weight="fill"
                  className="shrink-0 text-green-500"
                />
                <span className="min-w-0 flex-1 truncate">{q.titleMn}</span>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  +{q.xp_reward} XP
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Per-question review — collapsed by default */}
        <button
          type="button"
          onClick={() => setReviewOpen((o) => !o)}
          className="mt-6 mb-3 flex w-full items-center justify-between"
        >
          <h2 className="text-sm font-semibold">
            Review{" "}
            <span className="font-normal text-muted-foreground">
              ({result.correct_count}/{result.total_questions})
            </span>
          </h2>
          {reviewOpen ? (
            <CaretUp size={16} className="text-muted-foreground" />
          ) : (
            <CaretDown size={16} className="text-muted-foreground" />
          )}
        </button>
        <div className={cn("space-y-3", !reviewOpen && "hidden")}>
          {detail.questions.map((q, i) => {
            const ans = resultByQuestion.get(q.id)
            const chosen = q.options.find((o) => o.id === ans?.option_id)
            const correct = ans?.is_correct ?? false

            return (
              <div key={q.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-2">
                  {ans ? (
                    correct ? (
                      <CheckCircle
                        size={18}
                        weight="fill"
                        className="mt-0.5 shrink-0 text-green-500"
                      />
                    ) : (
                      <XCircle
                        size={18}
                        weight="fill"
                        className="mt-0.5 shrink-0 text-red-500"
                      />
                    )
                  ) : (
                    <XCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {i + 1}. {q.text}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your answer:{" "}
                      {chosen ? (
                        <span className="font-medium">
                          {chosen.label}. {chosen.text}
                        </span>
                      ) : (
                        <span className="italic">Not answered</span>
                      )}
                    </p>
                    {ans?.explanation && (
                      <p className="mt-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs leading-relaxed text-foreground/80">
                        {ans.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <div className="shrink-0 border-t bg-card px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to readings
        </button>
      </div>
    </div>
  )
}
