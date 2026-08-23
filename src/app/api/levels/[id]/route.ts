import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { levelUpdateSchema } from '@/lib/validations/course'
import { updateLevel, deleteLevel } from '@/server/services/courses'
import { logActivity } from '@/server/services/activity'

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, levelUpdateSchema)
    try {
      const level = await updateLevel(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Level',
        entityId: level.id,
        details: level.name,
      })
      return ok({ level })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'levels:manage' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteLevel(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Level',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'levels:manage' }
)
