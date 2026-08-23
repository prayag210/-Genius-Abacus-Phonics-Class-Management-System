import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { enrollmentUpdateSchema } from '@/lib/validations/enrollment'
import { getEnrollment, updateEnrollment } from '@/server/services/enrollments'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const enrollment = await getEnrollment(params.id)
    if (!enrollment) throw new ApiError(404, 'Enrollment not found.')
    return ok({ enrollment })
  },
  { action: 'enrollments:read' }
)

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, enrollmentUpdateSchema)
    try {
      const enrollment = await updateEnrollment(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Enrollment',
        entityId: enrollment.id,
        details: `${enrollment.student.fullName} → ${enrollment.course.name}`,
      })
      return ok({ enrollment })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'enrollments:manage' }
)
