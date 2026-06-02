"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"

export default function GetStartedPage() {
  const router = useRouter()
  const { token, user, _hasHydrated } = useAuthStore()

  // Already signed in? Skip the landing screen.
  useEffect(() => {
    if (!_hasHydrated) return
    if (token && user) {
      router.replace(user.isOnboarding ? "/onboarding" : "/")
    }
  }, [_hasHydrated, token, user, router])

  if (!_hasHydrated || (token && user)) return null

  return (
    <div className="relative flex h-full flex-col">
      <Image
        src="/assets/greeting.png"
        alt=""
        fill
        priority
        sizes="(max-width: 640px) 100vw, 384px"
        className="object-cover"
      />

      {/* Button pinned to the bottom over a legibility gradient */}
      <div className="relative z-10 mt-auto bg-gradient-to-t from-black/70 via-black/40 to-transparent px-6 pt-20 pb-10">
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push("/auth")}
        >
          Get started
        </Button>
      </div>
    </div>
  )
}
