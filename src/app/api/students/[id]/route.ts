import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { studentUpdateSchema } from '@/lib/validations/student'
import {
  getStudent,
  updateStudent,
  deleteStudent,
  teacherCanAccessStudent,
} from '@/server/services/students'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    const student = await getStudent(params.id)
    if (!student) throw new ApiError(404, 'Student not found.')
    if (user.role === 'TEACHER' && user.teacher) {
      const allowed = await teacherCanAccessStudent(user.teacher.id, params.id)
      if (!allowed) throw new ApiError(403, 'You can only view your own students.')
    }
    return ok({ student })
  },
  { action: 'students:read' }
)

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, studentUpdateSchema)
    try {
      const student = await updateStudent(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Student',
        entityId: student.id,
        details: student.fullName,
      })
      return ok({ student })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'students:manage' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    try {
      await deleteStudent(params.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'DELETE',
        entity: 'Student',
        entityId: params.id,
      })
      return ok({ ok: true })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'students:manage' }
)
