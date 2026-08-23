import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { skillRatingSchema } from '@/lib/validations/test'
import { createSkillRating, listSkillRatings } from '@/server/services/tests'
import { teacherCanAccessStudent } from '@/server/services/students'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const studentId = req.nextUrl.searchParams.get('studentId') ?? undefined
    const teacherId =
      user.role === 'TEACHER' && user.teacher ? user.teacher.id : req.nextUrl.searchParams.get('teacherId') ?? undefined
    const ratings = await listSkillRatings({ studentId, teacherId })
    return ok({ ratings })
  },
  { action: 'progress:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, skillRatingSchema)
    if (user.role === 'TEACHER') {
      if (!user.teacher) throw new ApiError(403, 'Teacher profile missing.')
      const allowed = await teacherCanAccessStudent(user.teacher.id, input.studentId)
      if (!allowed) throw new ApiError(403, 'You can only rate your own students.')
    }
    try {
      const rating = await createSkillRating({
        ...input,
        ratedById: user.teacher?.id ?? null,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'RATE',
        entity: 'SkillRating',
        entityId: rating.id,
        details: `${input.skillName}: ${input.rating}/5`,
      })
      return ok({ rating }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'progress:manage' }
)
