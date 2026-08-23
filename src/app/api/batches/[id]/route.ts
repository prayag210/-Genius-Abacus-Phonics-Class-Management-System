import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { batchUpdateSchema } from '@/lib/validations/batch'
import { getBatch, updateBatch, deleteBatch } from '@/server/services/batches'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const batch = await getBatch(params.id)
    if (!batch) throw new ApiError(404, 'Batch not found.')
    return ok({ batch })
  },
  { action: 'batches:read' }
)

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, batchUpdateSchema)
    try {
      const batch = await updateBatch(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Batch',
        entityId: batch.id,
        details: batch.name,
      })
      return ok({ batch })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'batches:manage' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteBatch(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Batch',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'batches:manage' }
)
