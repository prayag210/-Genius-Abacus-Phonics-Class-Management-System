import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { submissionUpdateSchema } from '@/lib/validations/homework'
import { updateSubmission } from '@/server/services/homework'
import { logActivity } from '@/server/services/activity'

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, submissionUpdateSchema)
    try {
      const submission = await updateSubmission(params.id, input.studentId, input.status, input.remarks)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'SUBMISSION_UPDATE',
        entity: 'Homework',
        entityId: params.id,
        details: `${input.studentId} → ${input.status}`,
      })
      return ok({ submission })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'homework:manage' }
)
