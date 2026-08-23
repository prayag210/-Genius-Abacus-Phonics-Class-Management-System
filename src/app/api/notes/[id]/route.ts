import { withAuth, ok, handleDbError, ApiError } from '@/lib/api'
import { deleteTeacherNote } from '@/server/services/tests'

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    if (!user.teacher) throw new ApiError(403, 'Only teachers can manage notes.')
    try {
      await deleteTeacherNote(params.id, user.teacher.id, user.role === 'ADMIN')
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'progress:manage' }
)
