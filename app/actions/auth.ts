'use server'

import { redirect } from 'next/navigation'
import { clearSession, loginWithPin } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'

const attempts = new Map<string, { count: number; resetAt: number }>()

type LoginResult =
  | { ok: true; role: 'ADMIN' | 'MIEL' | 'VIEWER' }
  | { ok: false; message: string }

export async function loginAction(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? 'Ongeldige login' }
  }

  const now = Date.now()
  const key = parsed.data.displayName.toLowerCase()
  const current = attempts.get(key)

  if (current && current.resetAt > now && current.count >= Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS ?? 8)) {
    return { ok: false as const, message: 'Te veel pogingen. Probeer straks opnieuw.' }
  }

  const result = await loginWithPin(parsed.data.displayName, parsed.data.pin)
  if (!result.ok) {
    attempts.set(key, {
      count: current && current.resetAt > now ? current.count + 1 : 1,
      resetAt: now + Number(process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS ?? 60) * 1000,
    })
  }

  return result
}

export async function logoutAction() {
  await clearSession()
  redirect('/login')
}
