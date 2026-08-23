import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { teacherAccountSchema } from '@/lib/validations/teacher'
import { manageTeacherAccount } from '@/server/services/teachers'
import { logActivity } from '@/server/services/activity'

export const POST = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, teacherAccountSchema)
    try {
      const result = await manageTeacherAccount(params.id, input.action, input.username, input.password)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: `ACCOUNT_${input.action}`,
        entity: 'Teacher',
        entityId: params.id,
        details: `username: ${result.username}`,
      })
      return ok(result)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'teachers:manage' }
)
