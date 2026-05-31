const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5173"

export class ApiError extends Error {
  readonly status: number
  readonly coins?: number

  constructor(status: number, message: string, coins?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.coins = coins
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  token?: string
  body?: unknown
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, body, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      coins?: number
    }
    throw new ApiError(res.status, data.error ?? "Request failed", data.coins)
  }

  return res.json() as Promise<T>
}
