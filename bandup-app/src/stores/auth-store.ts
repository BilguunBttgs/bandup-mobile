import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

import { signin as apiSignin, signup as apiSignup } from "@/lib/api";
import type { SigninPayload, SignupPayload, User } from "@/lib/api";

export type { SignupPayload, SigninPayload };

const TOKEN_KEY = "bandup_token";

// expo-secure-store doesn't support web — fall back to localStorage
const storage = {
  async get(key: string) {
    if (Platform.OS === "web") return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async delete(key: string) {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Store shape ──────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  /** True once the stored token has been read on startup. */
  isHydrated: boolean;

  // Actions
  signup: (payload: SignupPayload) => Promise<void>;
  signin: (payload: SigninPayload) => Promise<void>;
  signout: () => Promise<void>;
  /** Load the stored token from secure storage (call once on app start). */
  hydrate: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,
  isHydrated: false,

  /** Register then immediately sign in — sets token so root layout redirects to (app). */
  signup: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await apiSignup(payload);
      // Auto-signin so the user lands on the app without an extra step
      const { token, user } = await apiSignin({
        identifier: payload.email,
        password: payload.password,
      });
      await storage.set(TOKEN_KEY, token);
      set({ token, user, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  signin: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await apiSignin(payload);
      await storage.set(TOKEN_KEY, token);
      set({ token, user, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  signout: async () => {
    await storage.delete(TOKEN_KEY);
    set({ token: null, user: null });
  },

  hydrate: async () => {
    try {
      const token = await storage.get(TOKEN_KEY);
      set({ token: token ?? null, isHydrated: true });
    } catch {
      set({ isHydrated: true }); // still mark hydrated on error
    }
  },

  clearError: () => set({ error: null }),
}));
