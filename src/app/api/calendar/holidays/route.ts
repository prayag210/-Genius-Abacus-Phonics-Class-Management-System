import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { holidayCreateSchema } from '@/lib/validations/institute'
import { listHolidays, createHoliday } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async () => {
    const holidays = await listHolidays()
    return ok({ holidays })
  },
  { action: 'calendar:read' }
)

export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, holidayCreateSchema)
    try {
      const holiday = await createHoliday(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Holiday',
        entityId: holiday.id,
        details: holiday.name,
      })
      return ok({ holiday }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'calendar:manage' }
)
