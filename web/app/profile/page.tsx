"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { EnvelopeSimple, Gear, SignOut, X } from "@phosphor-icons/react"

import { useAuthStore } from "@/store/auth"
import { authApi } from "@/lib/auth-api"
import { gameApi, type ActivityDay } from "@/lib/game-api"
import { ApiError } from "@/lib/api"
import { BottomNav } from "@/components/bottom-nav"
import { ActivityHeatmap } from "@/components/activity-heatmap"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ── Change-PIN modal ────────────────────────────────────────────────────────

function ChangePinModal({
  token,
  onClose,
}: {
  token: string
  onClose: () => void
}) {
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const pinField = (value: string, set: (v: string) => void) => ({
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(e.target.value.replace(/\D/g, "").slice(0, 4)),
    type: "password" as const,
    inputMode: "numeric" as const,
    maxLength: 4,
    placeholder: "••••",
    className: "tracking-[0.5em]",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (newPin.length !== 4 || currentPin.length !== 4) {
      setError("PINs must be 4 digits.")
      return
    }
    if (newPin !== confirmPin) {
      setError("New PINs do not match.")
      return
    }

    setSaving(true)
    try {
      await authApi.changePin(token, {
        current_pin: currentPin,
        new_pin: newPin,
      })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change PIN")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-xs rounded-2xl border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Change PIN</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
            PIN updated successfully.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-pin">Current PIN</Label>
              <Input
                id="current-pin"
                autoFocus
                {...pinField(currentPin, setCurrentPin)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pin">New PIN</Label>
              <Input id="new-pin" {...pinField(newPin, setNewPin)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pin">Confirm new PIN</Label>
              <Input
                id="confirm-pin"
                {...pinField(confirmPin, setConfirmPin)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Update PIN"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { token, user, clearAuth, _hasHydrated } = useAuthStore()

  const [activity, setActivity] = useState<ActivityDay[] | null>(null)
  const [error, setError] = useState("")
  const [pinOpen, setPinOpen] = useState(false)

  // Auth + onboarding guard
  useEffect(() => {
    if (!_hasHydrated) return
    if (!token || !user) {
      router.replace("/get-started")
      return
    }
    if (user.isOnboarding) router.replace("/onboarding")
  }, [_hasHydrated, token, user, router])

  // Fetch activity
  useEffect(() => {
    if (!token || !user || user.isOnboarding) return
    let cancelled = false
    gameApi
      .getActivity(token)
      .then((res) => {
        if (!cancelled) setActivity(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load")
        }
      })
    return () => {
      cancelled = true
    }
  }, [token, user])

  if (!_hasHydrated || !token || !user || user.isOnboarding) return null

  return (
    <div className="flex h-full flex-col">
      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <h1 className="mb-5 text-xl font-semibold">Profile</h1>
        {/* User card */}
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-primary/20">
            <Image
              src="/assets/bandup-mascot.png"
              alt={user.username}
              width={56}
              height={56}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{user.username}</p>
            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
              <EnvelopeSimple size={14} className="shrink-0" />
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50 active:bg-muted"
            aria-label="Change PIN"
          >
            <Gear size={16} />
            PIN
          </button>
        </div>

        {/* Activity heatmap */}
        <div className="mt-6">
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : activity === null ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : (
            <ActivityHeatmap activity={activity} />
          )}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => {
            clearAuth()
            router.replace("/get-started")
          }}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <SignOut size={18} />
          Log out
        </button>
      </main>

      {pinOpen && (
        <ChangePinModal token={token} onClose={() => setPinOpen(false)} />
      )}

      <BottomNav />
    </div>
  )
}
