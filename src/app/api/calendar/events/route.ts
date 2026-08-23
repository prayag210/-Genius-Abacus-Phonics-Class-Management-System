import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { eventCreateSchema } from '@/lib/validations/institute'
import { listEvents, createEvent } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest) => {
    const sp = req.nextUrl.searchParams
    const from = sp.get('from') ? new Date(`${sp.get('from')}T00:00:00.000Z`) : undefined
    const to = sp.get('to') ? new Date(`${sp.get('to')}T00:00:00.000Z`) : undefined
    const events = await listEvents({ from, to })
    return ok({ events })
  },
  { action: 'calendar:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, eventCreateSchema)
    try {
      const event = await createEvent({
        ...input,
        createdById: user.teacher?.id ?? null,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'CalendarEvent',
        entityId: event.id,
        details: event.title,
      })
      return ok({ event }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'calendar:manage' }
)
