import { apiFetch } from "./api"

export type User = {
  id: number
  username: string
  email: string
  isOnboarding: boolean
  onboardingStep: number
  createdAt: number
}

export type SigninResponse = {
  token: string
  user: User
}

export type OnboardingStepResponse = {
  step: number
  nextStep: number | null
  data: Record<string, unknown>
}

export type ReadingSummary = {
  id: number
  title: string
  level: string
  timerSeconds: number
  questionCount: number
  completed: boolean
  bestBandScore: number | null
}

export type ReadingOption = {
  id: number
  questionId: number
  label: string
  text: string
}

export type ReadingQuestion = {
  id: number
  order: number
  text: string
  type: string
  options: ReadingOption[]
}

export type ReadingDetail = {
  id: number
  title: string
  passage: string
  level: string
  timerSeconds: number
  questions: ReadingQuestion[]
}

export type ReadingSubmitPayload = {
  answers: { question_id: number; option_id: number }[]
  time_taken_seconds: number
}

export type ReadingAnswerResult = {
  question_id: number
  option_id: number
  is_correct: boolean
  explanation: string | null
}

export type ReadingSubmitResult = {
  correct_count: number
  total_questions: number
  band_score: number
  time_taken_seconds: number
  answers: ReadingAnswerResult[]
  xp_earned: number
  coins_earned: number
  quests_completed: {
    titleMn: string
    xp_reward: number
    coin_reward: number
  }[]
  character: { skill: string; hp: number; level: number; xp: number }
  rewards: {
    skill_xp: number
    skill_level: number
    leveled_up: boolean
    total_xp: number
    coins: number
  }
}

export const authApi = {
  signup: (payload: { username: string; email: string; password: string }) =>
    apiFetch<User>("/auth/signup", { method: "POST", body: payload }),

  signin: (payload: { identifier: string; password: string }) =>
    apiFetch<SigninResponse>("/auth/signin", { method: "POST", body: payload }),

  onboardingStep: (token: string, step: number, data?: unknown) =>
    apiFetch<OnboardingStepResponse>("/auth/onboarding/step", {
      method: "POST",
      token,
      body: { step, ...(data !== undefined ? { data } : {}) },
    }),

  getReadings: (token: string, level?: string) =>
    apiFetch<ReadingSummary[]>(`/reading${level ? `?level=${level}` : ""}`, {
      token,
    }),

  getReading: (token: string, id: number) =>
    apiFetch<ReadingDetail>(`/reading/${id}`, { token }),

  changePin: (
    token: string,
    payload: { current_pin: string; new_pin: string }
  ) =>
    apiFetch<{ success: boolean }>("/auth/change-pin", {
      method: "POST",
      token,
      body: payload,
    }),

  submitReading: (token: string, id: number, payload: ReadingSubmitPayload) =>
    apiFetch<ReadingSubmitResult>(`/reading/${id}/submit`, {
      method: "POST",
      token,
      body: payload,
    }),
}
