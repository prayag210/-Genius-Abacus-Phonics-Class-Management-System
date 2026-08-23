import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { z } from 'zod'
import { progressionSchema } from '@/lib/validations/enrollment'
import { completeLevel, getLevelLadder } from '@/server/services/enrollments'
import { logActivity } from '@/server/services/activity'

/** Body schema — enrollmentId comes from the URL, not the body. */
const bodySchema = progressionSchema.omit({ enrollmentId: true })

/** Level ladder for an enrollment (history view). */
export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const ladder = await getLevelLadder(params.id)
    return ok({ ladder })
  },
  { action: 'enrollments:read' }
)

/** Complete the current level and move to the next one. */
export const POST = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, bodySchema)
    try {
      const result = await completeLevel({
        enrollmentId: params.id,
        result: input.result,
        nextLevelId: input.nextLevelId,
        completeCourse: input.completeCourse,
        teacherId: user.teacher?.id ?? null,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'LEVEL_COMPLETE',
        entity: 'Enrollment',
        entityId: params.id,
        details: result.nextLevelName
          ? `${result.enrollment.student.fullName} moved to ${result.nextLevelName}`
          : `${result.enrollment.student.fullName} completed the course`,
      })
      return ok(result)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'enrollments:manage' }
)
