import { withAuth, ok, handleDbError } from '@/lib/api'
import { deleteExpense } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteExpense(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Expense',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'expenses:manage' }
)
