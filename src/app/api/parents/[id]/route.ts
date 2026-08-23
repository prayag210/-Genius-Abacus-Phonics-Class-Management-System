import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { parentCreateSchema } from '@/lib/validations/student'
import { getParent, updateParent, deleteParent } from '@/server/services/parents'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const parent = await getParent(params.id)
    if (!parent) return ok({ parent: null }, 404)
    return ok({ parent })
  },
  { action: 'parents:read' }
)

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, parentCreateSchema)
    try {
      const parent = await updateParent(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Parent',
        entityId: parent.id,
        details: parent.name,
      })
      return ok({ parent })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'parents:manage' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteParent(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Parent',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'parents:manage' }
)
