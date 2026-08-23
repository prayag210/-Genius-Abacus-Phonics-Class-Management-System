import { NextRequest } from 'next/server'
import { withAuth, parseBody, parseQuery, ok, handleDbError } from '@/lib/api'
import { studentCreateSchema, studentQuerySchema } from '@/lib/validations/student'
import { listStudents, createStudent } from '@/server/services/students'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const query = parseQuery(req, studentQuerySchema)
    // Teachers are scoped to their own students
    if (user.role === 'TEACHER' && user.teacher) {
      query.teacherId = user.teacher.id
    }
    const students = await listStudents(query)
    return ok({ students })
  },
  { action: 'students:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, studentCreateSchema)
    try {
      const student = await createStudent(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Student',
        entityId: student.id,
        details: student.fullName,
      })
      return ok({ student }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'students:manage' }
)
