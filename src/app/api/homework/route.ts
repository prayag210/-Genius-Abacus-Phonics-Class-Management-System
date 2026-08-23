import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { homeworkCreateSchema } from '@/lib/validations/homework'
import { listHomework, createHomework } from '@/server/services/homework'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const teacherId =
      user.role === 'TEACHER' && user.teacher ? user.teacher.id : undefined
    const homework = await listHomework({ teacherId })
    return ok({ homework })
  },
  { action: 'homework:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, homeworkCreateSchema)
    try {
      const homework = await createHomework({
        ...input,
        createdById: user.teacher?.id ?? null,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Homework',
        entityId: homework.id,
        details: homework.title,
      })
      return ok({ homework }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'homework:manage' }
)
