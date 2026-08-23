import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { batchCreateSchema } from '@/lib/validations/batch'
import { listBatches, createBatch } from '@/server/services/batches'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined
    // Teachers see their own batches; admins see all
    const teacherId =
      user.role === 'TEACHER' && user.teacher ? user.teacher.id : req.nextUrl.searchParams.get('teacherId') ?? undefined
    const batches = await listBatches({ courseId, teacherId })
    return ok({ batches })
  },
  { action: 'batches:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, batchCreateSchema)
    try {
      const batch = await createBatch(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Batch',
        entityId: batch.id,
        details: batch.name,
      })
      return ok({ batch }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'batches:manage' }
)
