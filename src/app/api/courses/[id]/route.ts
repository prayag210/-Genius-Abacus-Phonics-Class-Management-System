import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { courseUpdateSchema } from '@/lib/validations/course'
import { getCourse, updateCourse, deleteCourse, canDeleteCourse } from '@/server/services/courses'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const course = await getCourse(params.id)
    if (!course) return ok({ course: null }, 404)
    return ok({ course })
  },
  { action: 'courses:read' }
)

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, courseUpdateSchema)
    try {
      const course = await updateCourse(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Course',
        entityId: course.id,
        details: course.name,
      })
      return ok({ course })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'courses:manage' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteCourse(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Course',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'courses:manage' }
)
