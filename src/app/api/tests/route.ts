import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { testCreateSchema } from '@/lib/validations/test'
import { listTests, createTest } from '@/server/services/tests'
import { db } from '@/lib/db'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined
    let teacherBatchIds: string[] | undefined
    if (user.role === 'TEACHER' && user.teacher) {
      const batches = await db.batch.findMany({
        where: { teacherId: user.teacher.id },
        select: { id: true },
      })
      teacherBatchIds = batches.map((b) => b.id)
    }
    const tests = await listTests({ courseId, teacherBatchIds })
    return ok({ tests })
  },
  { action: 'tests:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, testCreateSchema)
    try {
      const test = await createTest(input, user.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Test',
        entityId: test.id,
        details: test.name,
      })
      return ok({ test }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'tests:manage' }
)
