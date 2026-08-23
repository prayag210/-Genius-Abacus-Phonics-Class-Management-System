import { withAuth, ok, handleDbError, ApiError } from '@/lib/api'
import { getTest, deleteTest } from '@/server/services/tests'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const test = await getTest(params.id)
    if (!test) throw new ApiError(404, 'Test not found.')
    return ok({ test })
  },
  { action: 'tests:read' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteTest(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Test',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'tests:manage' }
)
