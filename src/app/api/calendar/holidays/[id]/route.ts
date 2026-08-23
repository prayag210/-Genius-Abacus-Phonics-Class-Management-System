import { withAuth, ok, handleDbError } from '@/lib/api'
import { deleteHoliday } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteHoliday(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Holiday',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'calendar:manage' }
)
