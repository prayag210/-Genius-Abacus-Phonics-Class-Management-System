import { NextRequest } from 'next/server'
import { withAuth, parseQuery, ok } from '@/lib/api'
import { z } from 'zod'
import { globalSearch } from '@/server/services/search'

const querySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters').max(100),
})

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const { q } = parseQuery(req, querySchema)
    const results = await globalSearch(q, user.role === 'TEACHER' ? user.teacher?.id : undefined)
    return ok(results)
  },
  { roles: ['ADMIN', 'TEACHER'] }
)
