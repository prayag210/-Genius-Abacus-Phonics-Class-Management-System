/**
 * Authentication core: password hashing, session management, and helpers
 * for protecting server components and API routes.
 *
 * - Passwords are hashed with bcrypt (12 rounds).
 * - Sessions are database-backed: a random 256-bit token is stored in an
 *   httpOnly cookie; only its SHA-256 hash is persisted.
 * - Sessions expire after 7 days and are deleted on logout.
 */
import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import type { Role, Teacher, User } from '@prisma/client'

export const SESSION_COOKIE = 'gacs_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const BCRYPT_ROUNDS = 12

export type SessionUser = {
  id: string
  username: string
  email: string | null
  role: Role
  isActive: boolean
  teacher: Pick<Teacher, 'id' | 'fullName' | 'branch'> | null
}

// ---------- Passwords ----------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

// ---------- Tokens ----------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

// ---------- Sessions ----------

export async function createSession(
  userId: string,
  meta?: { userAgent?: string | null; ip?: string | null }
): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta?.userAgent?.slice(0, 255) ?? null,
      ip: meta?.ip?.slice(0, 64) ?? null,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } })
}

/**
 * Get the currently authenticated user (or null).
 * Validates the session token, expiry, and user status on every call.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: { teacher: { select: { id: true, fullName: true, branch: true } } },
      },
    },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  if (!session.user.isActive) return null

  const u = session.user
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    teacher: u.teacher ?? null,
  }
}

/** For server components: redirect to /login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

/** For server components: redirect to /login (unauthenticated) or /dashboard (wrong role). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') redirect('/dashboard')
  return user
}

/** For API routes: returns the user or null (callers respond 401). */
export async function getApiUser(): Promise<SessionUser | null> {
  return getSessionUser()
}

// ---------- Login / logout ----------

export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string }

export async function login(
  username: string,
  password: string,
  meta?: { userAgent?: string | null; ip?: string | null }
): Promise<LoginResult> {
  const user = await db.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    include: { teacher: { select: { id: true, fullName: true, branch: true } } },
  })

  if (!user) {
    // Compare against a dummy hash to keep timing consistent
    await bcrypt.compare(password, '$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpEyR2eKok4Ma8V0PJXcgWJ6eq8V.')
    return { ok: false, error: 'Invalid username or password.' }
  }
  if (!user.isActive) {
    return { ok: false, error: 'This account has been deactivated. Contact the administrator.' }
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return { ok: false, error: 'Invalid username or password.' }
  }

  await createSession(user.id, meta)
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      teacher: user.teacher,
    },
  }
}
