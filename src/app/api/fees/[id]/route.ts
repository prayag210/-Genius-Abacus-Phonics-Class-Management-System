import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { feeUpdateSchema } from '@/lib/validations/fee'
import { updateFeeRecord } from '@/server/services/fees'
import { logActivity } from '@/server/services/activity'

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, feeUpdateSchema)
    try {
      const fee = await updateFeeRecord(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'FeeRecord',
        entityId: fee.id,
        details: `${fee.student.fullName} — ${fee.level.name}`,
      })
      return ok({ fee })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'fees:manage' }
)
