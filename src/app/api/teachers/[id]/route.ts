import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError, ApiError } from '@/lib/api'
import { teacherUpdateSchema } from '@/lib/validations/teacher'
import {
  getTeacher,
  updateTeacher,
  deleteTeacher,
  setTeacherActive,
  canDeleteTeacher,
} from '@/server/services/teachers'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    const teacher = await getTeacher(params.id)
    if (!teacher) throw new ApiError(404, 'Teacher not found.')
    return ok({ teacher })
  },
  { action: 'teachers:read' }
)

export const PUT = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const input = await parseBody(req, teacherUpdateSchema)
    try {
      const teacher = await updateTeacher(params.id, input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Teacher',
        entityId: teacher.id,
        details: teacher.fullName,
      })
      return ok({ teacher })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'teachers:manage' }
)

/** Toggle active/inactive */
export const PATCH = withAuth<Record<string, string>>(
  async (req, { params, user }) => {
    const body = (await req.json().catch(() => ({}))) as { isActive?: boolean }
    if (typeof body.isActive !== 'boolean') {
      throw new ApiError(422, 'isActive (boolean) is required.')
    }
    const teacher = await setTeacherActive(params.id, body.isActive)
    await logActivity({
      userId: user.id,
      userName: user.username,
      action: body.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entity: 'Teacher',
      entityId: teacher.id,
      details: teacher.fullName,
    })
    return ok({ teacher })
  },
  { action: 'teachers:manage' }
)

export const DELETE = withAuth<Record<string, string>>(
  async (_req, { params, user }) => {
    const safety = await canDeleteTeacher(params.id)
    if (!safety.ok) throw new ApiError(409, safety.reason)
    await deleteTeacher(params.id)
    await logActivity({
      userId: user.id,
      userName: user.username,
      action: 'DELETE',
      entity: 'Teacher',
      entityId: params.id,
    })
    return ok({ ok: true })
  },
  { action: 'teachers:manage' }
)
