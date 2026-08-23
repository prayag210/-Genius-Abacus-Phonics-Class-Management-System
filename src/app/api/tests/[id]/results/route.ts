import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { testResultSchema } from '@/lib/validations/test'
import { getTest, saveTestResults } from '@/server/services/tests'
import { teacherCanAccessStudent } from '@/server/services/students'
import { logActivity } from '@/server/services/activity'

export const POST = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, testResultSchema)
    const test = await getTest(params.id)
    if (!test) throw new ApiError(404, 'Test not found.')

    // Teachers can only enter results for their own students
    if (user.role === 'TEACHER' && user.teacher) {
      for (const r of input.results) {
        const allowed = await teacherCanAccessStudent(user.teacher.id, r.studentId)
        if (!allowed) throw new ApiError(403, 'You can only enter results for your own students.')
      }
    }

    try {
      const result = await saveTestResults(
        params.id,
        input.results.map((r) => ({ studentId: r.studentId, marks: r.marks, comment: r.comment })),
        user.teacher?.id ?? null
      )
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'RESULTS',
        entity: 'Test',
        entityId: params.id,
        details: `${result.saved} result(s) for ${test.name}`,
      })
      return ok(result)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'results:manage' }
)
