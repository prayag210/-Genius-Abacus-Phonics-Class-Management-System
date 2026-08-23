import { NextRequest } from 'next/server'
import { withAuth, parseQuery, ok } from '@/lib/api'
import { feeQuerySchema } from '@/lib/validations/fee'
import { listFeeRecords, feeSummary } from '@/server/services/fees'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const query = parseQuery(req, feeQuerySchema)
    // Teachers only see fees of their own students
    if (user.role === 'TEACHER' && user.teacher) {
      query.teacherId = user.teacher.id
    }
    const [fees, summary] = await Promise.all([
      listFeeRecords(query),
      feeSummary(
        user.role === 'TEACHER' && user.teacher ? { teacherId: user.teacher.id } : undefined
      ),
    ])
    return ok({ fees, summary })
  },
  { action: 'fees:read' }
)
