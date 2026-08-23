import { withAuth, parseBody, ok, ApiError } from '@/lib/api'
import { changePasswordSchema } from '@/lib/validations/auth'
import { verifyPassword, hashPassword, destroyAllUserSessions, createSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/server/services/activity'

export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, changePasswordSchema)

    const dbUser = await db.user.findUnique({ where: { id: user.id } })
    if (!dbUser) throw new ApiError(404, 'User not found.')

    const valid = await verifyPassword(input.currentPassword, dbUser.passwordHash)
    if (!valid) {
      throw new ApiError(422, 'Your current password is incorrect.')
    }

    // Invalidate all sessions, then create a fresh one so the user stays signed in
    await destroyAllUserSessions(user.id)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    })
    await createSession(user.id)
    await logActivity({
      userId: user.id,
      userName: user.username,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user.id,
    })

    return ok({ ok: true })
  },
  { roles: ['ADMIN', 'TEACHER'] }
)
