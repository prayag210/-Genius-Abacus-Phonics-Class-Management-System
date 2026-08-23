import { NextRequest } from 'next/server'
import { withAuth, parseBody, parseQuery, ok, handleDbError } from '@/lib/api'
import { teacherCreateSchema, teacherQuerySchema } from '@/lib/validations/teacher'
import { createTeacher, listTeachers } from '@/server/services/teachers'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const query = parseQuery(req, teacherQuerySchema)
    const teachers = await listTeachers(query)
    return ok({ teachers })
  },
  { action: 'teachers:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, teacherCreateSchema)
    try {
      const teacher = await createTeacher(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Teacher',
        entityId: teacher.id,
        details: teacher.fullName,
      })
      return ok({ teacher }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'teachers:manage' }
)
