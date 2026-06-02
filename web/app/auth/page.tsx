"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"
import { authApi } from "@/lib/auth-api"
import { ApiError } from "@/lib/api"
import Image from "next/image"

const pinSchema = z
  .string()
  .length(4, "Must be exactly 4 digits")
  .regex(/^\d{4}$/, "Digits only")

const signinSchema = z.object({
  identifier: z.string().min(1, "Required"),
  password: pinSchema,
})

const signupSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "At most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  email: z.string().email("Invalid email"),
  password: pinSchema,
})

type SigninValues = z.infer<typeof signinSchema>
type SignupValues = z.infer<typeof signupSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function LoginForm() {
  const router = useRouter()
  const { setAuth, _hasHydrated } = useAuthStore()
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninValues>({
    resolver: zodResolver(signinSchema),
  })

  async function onSubmit(values: SigninValues) {
    setServerError("")
    try {
      const res = await authApi.signin(values)
      setAuth(res.token, res.user)
      router.replace(res.user.isOnboarding ? "/onboarding" : "/")
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Something went wrong"
      )
    }
  }

  if (!_hasHydrated) return null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="signin-identifier">Email or username</Label>
        <Input
          id="signin-identifier"
          placeholder="you@example.com"
          autoComplete="username email"
          {...register("identifier")}
        />
        <FieldError message={errors.identifier?.message} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="signin-password">4-digit PIN</Label>
        <Input
          id="signin-password"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          autoComplete="current-password"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignupValues) {
    setServerError("")
    try {
      await authApi.signup(values)
      onSuccess()
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Something went wrong"
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="signup-username">Username</Label>
        <Input
          id="signup-username"
          placeholder="yourname"
          autoComplete="username"
          {...register("username")}
        />
        <FieldError message={errors.username?.message} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="signup-password">4-digit PIN</Label>
        <Input
          id="signup-password"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          autoComplete="new-password"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const { token, user, _hasHydrated } = useAuthStore()
  const [tab, setTab] = useState("login")
  const [signupDone, setSignupDone] = useState(false)

  useEffect(() => {
    if (!_hasHydrated) return
    if (token && user) {
      router.replace(user.isOnboarding ? "/onboarding" : "/")
    }
  }, [_hasHydrated, token, user, router])

  if (!_hasHydrated || (token && user)) return null

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">BandUp</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your IELTS preparation companion
            </p>
          </div>
          <Image
            src="/assets/bandup-mascot.png"
            alt="BandUp"
            width={100}
            height={100}
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            {signupDone ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Account created! Sign in to continue.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSignupDone(false)
                    setTab("login")
                  }}
                >
                  Go to sign in
                </Button>
              </div>
            ) : (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-6 w-full">
                  <TabsTrigger value="login" className="flex-1">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex-1">
                    Sign up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <LoginForm />
                </TabsContent>

                <TabsContent value="signup">
                  <SignupForm onSuccess={() => setSignupDone(true)} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
