const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5173";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  isOnboarding: boolean;
  onboardingStep: number;
  createdAt: number;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string; // 4-digit PIN
}

export interface SigninPayload {
  identifier: string; // email or username
  password: string; // 4-digit PIN
}

export interface SigninResponse {
  token: string;
  user: User;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...fetchOptions } = options ?? {};
  console.log("Request working", API_URL, path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  let res: Response;
  try {
    console.log("API URL", API_URL);
    res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
  } catch (err) {
    // Network-level failure (server down, no connection, CORS preflight blocked, etc.)
    throw new Error(
      `Cannot reach server at ${API_URL}. Is the backend running?`,
    );
  }

  // Read the body as text first — res.json() throws if the server sends
  // HTML, plain text, or an empty body (e.g. a Vite 404 page).
  const text = await res.text();

  let data: unknown;
  try {
    data = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body — surface the raw text so it's easier to debug
    throw new Error(
      `Unexpected response (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  if (!res.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ??
        `Request failed: ${res.status}`,
    );
  }

  return data as T;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

/** POST /auth/signup — returns the new user (no token). */
export function signup(payload: SignupPayload): Promise<User> {
  console.log("signup working", payload);
  return request<User>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /auth/signin — returns JWT + user. */
export function signin(payload: SigninPayload): Promise<SigninResponse> {
  return request<SigninResponse>("/auth/signin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
