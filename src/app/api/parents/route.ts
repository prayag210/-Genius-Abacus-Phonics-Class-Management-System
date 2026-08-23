import { NextRequest } from 'next/server'
import { withAuth, parseBody, parseQuery, ok, handleDbError } from '@/lib/api'
import { parentCreateSchema } from '@/lib/validations/student'
import { listQuerySchema } from '@/lib/validations/shared'
import { listParents, createParent } from '@/server/services/parents'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest) => {
    const query = parseQuery(req, listQuerySchema)
    const parents = await listParents({ q: query.q })
    return ok({ parents })
  },
  { action: 'parents:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, parentCreateSchema)
    try {
      const parent = await createParent(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Parent',
        entityId: parent.id,
        details: parent.name,
      })
      return ok({ parent }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'parents:manage' }
)
