import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { notificationCreateSchema } from '@/lib/validations/institute'
import { listNotifications, createNotification } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (_req: NextRequest, { user }) => {
    const notifications = await listNotifications(user.id, user.role)
    return ok({ notifications })
  },
  { action: 'notifications:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, notificationCreateSchema)
    try {
      const notification = await createNotification({
        title: input.title,
        message: input.message,
        type: input.type,
        role: input.role ?? null,
        createdById: user.teacher?.id ?? null,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Notification',
        entityId: notification.id,
        details: notification.title,
      })
      return ok({ notification }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'notifications:manage' }
)
