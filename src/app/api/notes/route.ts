import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { teacherNoteSchema } from '@/lib/validations/test'
import { createTeacherNote } from '@/server/services/tests'
import { teacherCanAccessStudent } from '@/server/services/students'
import { logActivity } from '@/server/services/activity'

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, teacherNoteSchema)
    if (!user.teacher) throw new ApiError(403, 'Only teachers can add teacher notes.')
    // Teachers can only note their own students
    if (user.role === 'TEACHER') {
      const allowed = await teacherCanAccessStudent(user.teacher.id, input.studentId)
      if (!allowed) throw new ApiError(403, 'You can only add notes for your own students.')
    }
    try {
      const note = await createTeacherNote({
        studentId: input.studentId,
        note: input.note,
        date: input.date,
        teacherId: user.teacher.id,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'TeacherNote',
        entityId: note.id,
      })
      return ok({ note }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'progress:manage' }
)
