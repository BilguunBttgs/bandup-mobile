import {
  CalendarBlank,
  CalendarDots,
  CheckCircle,
  Coins,
  Lightning,
  Sun,
  type Icon,
} from "@phosphor-icons/react"

import { type Quest, type QuestType } from "@/lib/game-api"
import { cn } from "@/lib/utils"

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

// ── Quest group ─────────────────────────────────────────────────────────────────

const QUEST_GROUPS: {
  type: QuestType
  label: string
  icon: Icon
}[] = [
  { type: "daily", label: "Daily", icon: Sun },
  { type: "weekly", label: "Weekly", icon: CalendarBlank },
  { type: "monthly", label: "Monthly", icon: CalendarDots },
]

function QuestGroup({
  label,
  icon: Icon,
  quests,
}: {
  label: string
  icon: Icon
  quests: Quest[]
}) {
  if (quests.length === 0) return null

  const completed = quests.filter((q) => q.isCompleted).length

  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} weight="fill" className="text-muted-foreground" />
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {completed}/{quests.length}
        </span>
      </div>
      <div className="space-y-3">
        {quests.map((q) => (
          <QuestItem key={q.id} quest={q} />
        ))}
      </div>
    </section>
  )
}

// ── Section ─────────────────────────────────────────────────────────────────────

// Renders active quests grouped by period. By default all periods (daily /
// weekly / monthly) are shown; pass `types` to limit which groups render.
export function QuestsSection({
  quests,
  types,
}: {
  quests: Quest[]
  types?: QuestType[]
}) {
  const groups = types
    ? QUEST_GROUPS.filter((g) => types.includes(g.type))
    : QUEST_GROUPS

  return (
    <>
      {groups.map((group) => (
        <QuestGroup
          key={group.type}
          label={group.label}
          icon={group.icon}
          quests={quests.filter((q) => q.questType === group.type)}
        />
      ))}
    </>
  )
}
