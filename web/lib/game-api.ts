import { apiFetch } from "./api"

export type Skill = "reading" | "listening" | "writing" | "speaking"

export type GameStats = {
  totalXp: number
  coins: number
  streakDays: number
  lastActivityDate: string | null
}

export type GameCharacter = {
  skill: Skill
  hp: number
  xp: number
  level: number
  isAlive: boolean
  skinId: string | null
  // Self-assessed IELTS band (0–9), set during onboarding; null if unrated
  bandScore: number | null
}

export type Quest = {
  id: number
  titleMn: string
  descriptionMn: string
  skillTarget: string
  requiredCount: number
  progress: number
  isCompleted: boolean
  xpReward: number
  coinReward: number
}

export type GameState = {
  stats: GameStats
  characters: GameCharacter[]
  quests: Quest[]
}

export const gameApi = {
  // Full player state: stats, all 4 characters, today's quests
  getState: (token: string) => apiFetch<GameState>("/game/state", { token }),
}
