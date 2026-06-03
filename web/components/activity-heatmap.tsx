"use client"

import { useMemo, useState } from "react"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"

import { type ActivityDay } from "@/lib/game-api"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

type DayCell = {
  iso: string
  day: number
  count: number
  inMonth: boolean
  future: boolean
}

// Green intensity buckets, mirroring GitHub's contribution graph.
function levelClass(count: number) {
  if (count <= 0) return "bg-muted text-muted-foreground"
  if (count === 1) return "bg-green-500/30 text-foreground"
  if (count === 2) return "bg-green-500/55 text-foreground"
  if (count === 3) return "bg-green-500/80 text-white"
  return "bg-green-500 text-white"
}

// Builds the calendar grid (full weeks, Sunday→Saturday) for one month.
function buildMonth(
  year: number,
  month: number,
  countByDate: Map<string, number>
) {
  const todayIso = new Date().toISOString().slice(0, 10)

  const first = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const numWeeks = Math.ceil((first.getUTCDay() + daysInMonth) / 7)

  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay()) // back to the Sunday of week 1

  const weeks: DayCell[][] = []
  const cur = new Date(start)
  let monthTotal = 0

  for (let w = 0; w < numWeeks; w++) {
    const week: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10)
      const inMonth = cur.getUTCMonth() === month
      const count = countByDate.get(iso) ?? 0
      if (inMonth) monthTotal += count
      week.push({
        iso,
        day: cur.getUTCDate(),
        count,
        inMonth,
        future: iso > todayIso,
      })
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    weeks.push(week)
  }

  return { weeks, monthTotal }
}

export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const countByDate = useMemo(
    () => new Map(activity.map((a) => [a.date, a.count])),
    [activity]
  )

  const now = new Date()
  const [view, setView] = useState({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth(),
  })

  const isCurrentMonth =
    view.year === now.getUTCFullYear() && view.month === now.getUTCMonth()

  const { weeks, monthTotal } = useMemo(
    () => buildMonth(view.year, view.month, countByDate),
    [view, countByDate]
  )

  function shiftMonth(delta: number) {
    setView(({ year, month }) => {
      const next = month + delta
      return {
        year: year + Math.floor(next / 12),
        month: ((next % 12) + 12) % 12,
      }
    })
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Activity</h2>
        <span className="text-xs text-muted-foreground">
          {monthTotal} {monthTotal === 1 ? "exercise" : "exercises"}
        </span>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        {/* Month selector */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Previous month"
          >
            <CaretLeft size={18} />
          </button>
          <span className="text-sm font-semibold">
            {MONTH_NAMES[view.month]} {view.year}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="Next month"
          >
            <CaretRight size={18} />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1.5">
          {weeks.flat().map((cell) =>
            cell.inMonth ? (
              <div
                key={cell.iso}
                title={`${cell.iso}: ${cell.count}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium",
                  levelClass(cell.count),
                  cell.future && "opacity-40"
                )}
              >
                {cell.day}
              </div>
            ) : (
              <div key={cell.iso} aria-hidden />
            )
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={cn("h-2.5 w-2.5 rounded-[2px]", levelClass(n))}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  )
}
