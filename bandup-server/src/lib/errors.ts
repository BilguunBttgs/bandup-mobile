import type { Hook } from "@hono/zod-validator";

export const errors = {
  // Auth
  AUTH_INVALID: "Нэвтрэх мэдээлэл буруу байна",
  AUTH_TAKEN: "Энэ нэр эсвэл имэйл бүртгэлтэй байна",
  AUTH_NOT_FOUND: "Тийм нэр эсвэл имэйлтэй хэрэглэгч олдсонгүй",
  AUTH_MISSING_TOKEN: "Нэвтрэх токен байхгүй байна",
  AUTH_INVALID_TOKEN: "Токен хүчингүй эсвэл хугацаа дууссан байна",
  AUTH_UNAUTHORIZED: "Зөвшөөрөлгүй хүсэлт",
  // Onboarding
  ONBOARDING_DONE: "Бүртгэлийн алхам аль хэдийн дууссан байна",
  INVALID_STEP: "Буруу алхам",
  // General
  NOT_FOUND: "Олдсонгүй",
  INVALID_ID: "Буруу ID",
  VALIDATION_ERROR: "Оруулсан мэдээлэл буруу байна",
  INTERNAL_ERROR: "Серверийн дотоод алдаа гарлаа",
  // Exercise
  NO_QUESTIONS: "Дасгалд асуулт байхгүй байна",
  // Gamification
  INSUFFICIENT_COINS: "Хүрэлцэхгүй монет",
  CHARACTER_DEAD: "Тэмдэгт нас барсан байна. Эргүүлэн амилуулна уу",
  STREAK_BROKEN: "Streak тасарлаа! HP хасагдлаа",
  // Shop
  BOOSTER_NOT_EQUIPPABLE: "Бустер зүүх боломжгүй",
} as const;

export function mongoError(code: keyof typeof errors): { error: string } {
  return { error: errors[code] };
}

// Reusable hook for @hono/zod-validator — returns the first issue message or a
// generic Mongolian fallback. Pass as the third argument to every zValidator call.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const zodValidationHook: Hook<unknown, any, string> = (result, c) => {
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? errors.VALIDATION_ERROR;
    return c.json({ error: msg }, 400);
  }
};
