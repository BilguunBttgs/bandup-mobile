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
}
