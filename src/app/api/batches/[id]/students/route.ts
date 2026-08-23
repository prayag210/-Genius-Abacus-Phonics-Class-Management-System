import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { batchStudentSchema } from '@/lib/validations/batch'
import { getBatch, addStudentsToBatch, removeStudentFromBatch, getBatchStudents } from '@/server/services/batches'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const students = await getBatchStudents(params.id)
    return ok({ students })
  },
  { action: 'batches:read' }
)

export const POST = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, batchStudentSchema)
    try {
      const result = await addStudentsToBatch(params.id, input.studentIds)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'ADD_STUDENTS',
        entity: 'Batch',
        entityId: params.id,
        details: `${result.added} student(s) added`,
      })
      return ok(result)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'batches:manage' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const url = new URL(req.url)
    const studentId = url.searchParams.get('studentId')
    if (!studentId) throw new ApiError(422, 'studentId query parameter is required.')
    await removeStudentFromBatch(params.id, studentId)
    await logActivity({
      userId: user.id,
      userName: user.username,
      action: 'REMOVE_STUDENT',
      entity: 'Batch',
      entityId: params.id,
      details: studentId,
    })
    return ok({ ok: true })
  },
  { action: 'batches:manage' }
)
