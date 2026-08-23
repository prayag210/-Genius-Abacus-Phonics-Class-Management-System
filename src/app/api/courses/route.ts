import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { courseCreateSchema } from '@/lib/validations/course'
import { listCourses, createCourse } from '@/server/services/courses'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async () => {
    const courses = await listCourses()
    return ok({ courses })
  },
  { action: 'courses:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, courseCreateSchema)
    try {
      const course = await createCourse(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Course',
        entityId: course.id,
        details: course.name,
      })
      return ok({ course }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'courses:manage' }
)
