import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { levelCreateSchema } from '@/lib/validations/course'
import { listLevels, createLevel } from '@/server/services/courses'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest) => {
    const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined
    const levels = await listLevels({ courseId: courseId || undefined })
    return ok({ levels })
  },
  { action: 'levels:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, levelCreateSchema)
    try {
      const level = await createLevel(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Level',
        entityId: level.id,
        details: level.name,
      })
      return ok({ level }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'levels:manage' }
)
