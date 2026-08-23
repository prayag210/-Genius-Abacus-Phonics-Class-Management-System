import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { attendanceSaveSchema } from '@/lib/validations/batch'
import { saveAttendance, getAttendanceForBatchDate } from '@/server/services/attendance'
import { getBatch } from '@/server/services/batches'
import { logActivity } from '@/server/services/activity'

/** GET ?batchId=&date= — attendance for a batch+date */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const batchId = req.nextUrl.searchParams.get('batchId')
    const dateStr = req.nextUrl.searchParams.get('date')
    if (!batchId || !dateStr) throw new ApiError(422, 'batchId and date are required.')

    const batch = await getBatch(batchId)
    if (!batch) throw new ApiError(404, 'Batch not found.')
    if (user.role === 'TEACHER' && user.teacher && batch.teacherId !== user.teacher.id) {
      throw new ApiError(403, 'You can only view attendance for your own batches.')
    }

    const records = await getAttendanceForBatchDate(batchId, new Date(`${dateStr}T00:00:00.000Z`))
    return ok({ records })
  },
  { action: 'attendance:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, attendanceSaveSchema)
    const batch = await getBatch(input.batchId)
    if (!batch) throw new ApiError(404, 'Batch not found.')
    if (user.role === 'TEACHER' && user.teacher && batch.teacherId !== user.teacher.id) {
      throw new ApiError(403, 'You can only mark attendance for your own batches.')
    }
    try {
      const result = await saveAttendance({
        batchId: input.batchId,
        date: new Date(`${input.date}T00:00:00.000Z`),
        records: input.records,
        markedById: user.teacher?.id ?? null,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'ATTENDANCE',
        entity: 'Batch',
        entityId: input.batchId,
        details: `${result.saved} record(s) on ${input.date}`,
      })
      return ok(result)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'attendance:manage' }
)
