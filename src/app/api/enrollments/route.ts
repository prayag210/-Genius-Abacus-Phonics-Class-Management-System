import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { enrollmentCreateSchema } from '@/lib/validations/enrollment'
import { createEnrollment, listEnrollments } from '@/server/services/enrollments'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const sp = req.nextUrl.searchParams
    // Teachers only see their own enrollments
    const teacherId =
      user.role === 'TEACHER' && user.teacher ? user.teacher.id : sp.get('teacherId') ?? undefined
    const enrollments = await listEnrollments({
      studentId: sp.get('studentId') ?? undefined,
      teacherId,
      courseId: sp.get('courseId') ?? undefined,
      status: sp.get('status') ?? undefined,
    })
    return ok({ enrollments })
  },
  { action: 'enrollments:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, enrollmentCreateSchema)
    try {
      const enrollment = await createEnrollment(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'ENROLL',
        entity: 'Enrollment',
        entityId: enrollment.id,
        details: `${enrollment.student.fullName} → ${enrollment.course.name}`,
      })
      return ok({ enrollment }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'enrollments:manage' }
)
