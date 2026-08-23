import { withAuth, ok, handleDbError, ApiError } from '@/lib/api'
import { markNotificationRead, markAllNotificationsRead } from '@/server/services/institute'

export const PUT = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await markNotificationRead(params.id, user.id)
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'notifications:read' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    void user
    throw new ApiError(405, 'Notifications are managed automatically.')
  },
  { action: 'notifications:read' }
)
