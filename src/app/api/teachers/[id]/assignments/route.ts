import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok } from '@/lib/api'
import { teacherAssignmentsSchema } from '@/lib/validations/teacher'
import { setTeacherAssignments } from '@/server/services/teachers'
import { logActivity } from '@/server/services/activity'

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, teacherAssignmentsSchema)
    await setTeacherAssignments(params.id, input.courseIds, input.levelIds)
    await logActivity({
      userId: user.id,
      userName: user.username,
      action: 'ASSIGN',
      entity: 'Teacher',
      entityId: params.id,
      details: `${input.courseIds.length} course(s), ${input.levelIds.length} level(s)`,
    })
    return ok({ ok: true })
  },
  { action: 'teachers:manage' }
)
