import { withAuth, ok, handleDbError, ApiError } from '@/lib/api'
import { deleteHomework, getHomeworkDetail } from '@/server/services/homework'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const homework = await getHomeworkDetail(params.id)
    if (!homework) throw new ApiError(404, 'Homework not found.')
    return ok({ homework })
  },
  { action: 'homework:read' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteHomework(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Homework',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'homework:manage' }
)
