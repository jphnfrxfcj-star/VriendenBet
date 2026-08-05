import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { Role } from './domain'
import { verifyHashedPin } from './pin'
import { users as demoUsers } from './demo-data'

const cookieName = 'mielbet_session'

type SessionPayload = {
  userId: string
  role: Role
  displayName: string
  exp: number
}

export type SessionUser = Omit<SessionPayload, 'exp'>

export async function verifyPin(pin: string, pinHash: string) {
  return verifyHashedPin(pin, pinHash)
}

export async function createSession(user: SessionUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 3,
  }
  const token = signPayload(payload)

  ;(await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 3,
  })
}

export async function clearSession() {
  ;(await cookies()).delete(cookieName)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value
  if (!token) {
    return null
  }

  const payload = verifyPayload(token)
  if (!payload || payload.exp < Date.now()) {
    return null
  }

  return {
    userId: payload.userId,
    role: payload.role,
    displayName: payload.displayName,
  }
}

export async function requireRole(roles: Role[]) {
  const session = await getSessionUser()
  if (!session || !roles.includes(session.role)) {
    throw new Error('Geen toegang')
  }

  return session
}

export async function loginWithPin(displayName: string, pin: string) {
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>>

  try {
    user = await prisma.user.findFirst({
      where: { displayName, isActive: true },
    })
  } catch (error) {
    return loginWithLocalFallback(displayName, pin, error)
  }

  if (!user || !(await verifyPin(pin, user.pinHash))) {
    return { ok: false as const, message: 'Naam of pincode is niet correct' }
  }

  await createSession({
    userId: user.id,
    role: user.role,
    displayName: user.displayName,
  })

  return { ok: true as const, role: user.role }
}

async function loginWithLocalFallback(displayName: string, pin: string, error: unknown) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_LOGIN !== 'true') {
    throw error
  }

  const demoUser = demoUsers.find((user) => user.displayName === displayName)
  const expectedPin = process.env.SEED_PIN ?? '2525'

  if (!demoUser || pin !== expectedPin) {
    return { ok: false as const, message: 'Naam of pincode is niet correct' }
  }

  await createSession({
    userId: `demo-${demoUser.displayName.toLowerCase().replaceAll(' ', '-')}`,
    role: demoUser.role,
    displayName: demoUser.displayName,
  })

  return { ok: true as const, role: demoUser.role }
}

function signPayload(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  return `${body}.${signature}`
}

function verifyPayload(token: string): SessionPayload | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) {
    return null
  }

  const expected = createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
  } catch {
    return null
  }
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET moet minstens 32 karakters bevatten')
  }

  return secret
}
