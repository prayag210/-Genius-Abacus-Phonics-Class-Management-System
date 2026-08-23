/**
 * Teacher service — CRUD, search/filter, course/level assignments,
 * and login account management.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import { hashPassword, destroyAllUserSessions } from '@/lib/auth'
import type { Prisma, Teacher } from '@prisma/client'
import type { TeacherCreateInput, TeacherUpdateInput } from '@/lib/validations/teacher'

const teacherInclude = {
  courses: { include: { course: { select: { id: true, name: true } } } },
  levels: { include: { level: { select: { id: true, name: true, courseId: true } } } },
  users: { select: { id: true, username: true, isActive: true, lastLoginAt: true, role: true } },
  _count: {
    select: {
      batches: { where: { isActive: true } },
      enrollments: { where: { status: 'ACTIVE' } },
    },
  },
} satisfies Prisma.TeacherInclude

export type TeacherWithRelations = Prisma.TeacherGetPayload<{ include: typeof teacherInclude }>

/** Convenience: the (single) login account of a teacher, if any. */
export function teacherAccount(teacher: TeacherWithRelations) {
  return teacher.users[0] ?? null
}

export async function listTeachers(params: {
  q?: string
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE'
  courseId?: string
}): Promise<TeacherWithRelations[]> {
  const where: Prisma.TeacherWhereInput = {}
  if (params.status && params.status !== 'ALL') {
    where.isActive = params.status === 'ACTIVE'
  }
  if (params.q) {
    where.OR = [
      { fullName: { contains: params.q, mode: 'insensitive' } },
      { phone: { contains: params.q, mode: 'insensitive' } },
      { email: { contains: params.q, mode: 'insensitive' } },
      { branch: { contains: params.q, mode: 'insensitive' } },
      { qualification: { contains: params.q, mode: 'insensitive' } },
    ]
  }
  if (params.courseId) {
    where.courses = { some: { courseId: params.courseId } }
  }
  return db.teacher.findMany({
    where,
    include: teacherInclude,
    orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
  })
}

export async function getTeacher(id: string): Promise<TeacherWithRelations | null> {
  return db.teacher.findUnique({ where: { id }, include: teacherInclude })
}

export async function createTeacher(input: TeacherCreateInput): Promise<Teacher> {
  const { createLogin, username, password, ...data } = input

  return db.$transaction(async (tx) => {
    const teacher = await tx.teacher.create({ data })

    if (createLogin && username && password) {
      if (password.length < 8) {
        throw new ApiError(422, 'Password must be at least 8 characters.')
      }
      const exists = await tx.user.findUnique({ where: { username: username.toLowerCase() } })
      if (exists) {
        throw new ApiError(409, `Username "${username}" is already taken.`)
      }
      await tx.user.create({
        data: {
          username: username.toLowerCase(),
          passwordHash: await hashPassword(password),
          role: 'TEACHER',
          isActive: true,
          teacherId: teacher.id,
        },
      })
    }

    return teacher
  })
}

export async function updateTeacher(id: string, input: TeacherUpdateInput): Promise<Teacher> {
  const existing = await db.teacher.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Teacher not found.')
  return db.teacher.update({ where: { id }, data: input })
}

/** Check whether a teacher can be safely deleted (no references from other records). */
export async function canDeleteTeacher(id: string): Promise<{ ok: boolean; reason?: string }> {
  const [enrollments, batches, studentLevels, testResults, skillRatings, homework, notes, certificates, events, meetings, markedAttendance] =
    await Promise.all([
      db.enrollment.count({ where: { teacherId: id } }),
      db.batch.count({ where: { teacherId: id } }),
      db.studentLevel.count({ where: { teacherId: id } }),
      db.testResult.count({ where: { teacherId: id } }),
      db.skillRating.count({ where: { ratedById: id } }),
      db.homework.count({ where: { createdById: id } }),
      db.teacherNote.count({ where: { teacherId: id } }),
      db.certificate.count({ where: { issuedById: id } }),
      db.calendarEvent.count({ where: { createdById: id } }),
      db.parentMeeting.count({ where: { teacherId: id } }),
      db.attendance.count({ where: { markedById: id } }),
    ])

  const blockers: string[] = []
  if (enrollments > 0) blockers.push(`${enrollments} enrollment(s)`)
  if (batches > 0) blockers.push(`${batches} batch(es)`)
  if (studentLevels > 0) blockers.push(`${studentLevels} student level record(s)`)
  if (testResults > 0) blockers.push(`${testResults} test result(s)`)
  if (skillRatings > 0) blockers.push(`${skillRatings} skill rating(s)`)
  if (homework > 0) blockers.push(`${homework} homework`)
  if (notes > 0) blockers.push(`${notes} teacher note(s)`)
  if (certificates > 0) blockers.push(`${certificates} certificate(s)`)
  if (events > 0) blockers.push(`${events} calendar event(s)`)
  if (meetings > 0) blockers.push(`${meetings} parent meeting(s)`)
  if (markedAttendance > 0) blockers.push(`${markedAttendance} attendance record(s)`)

  if (blockers.length > 0) {
    return {
      ok: false,
      reason: `This teacher is linked to ${blockers.join(', ')}. Deactivate the teacher instead of deleting, or reassign their records first.`,
    }
  }
  return { ok: true }
}

export async function deleteTeacher(id: string): Promise<void> {
  const safety = await canDeleteTeacher(id)
  if (!safety.ok) {
    throw new ApiError(409, safety.reason)
  }
  await db.$transaction(async (tx) => {
    // teacher course/level assignments cascade; user account is detached
    await tx.user.updateMany({ where: { teacherId: id }, data: { isActive: false, teacherId: null } })
    await tx.teacher.delete({ where: { id } })
  })
}

export async function setTeacherActive(id: string, isActive: boolean): Promise<Teacher> {
  const existing = await db.teacher.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Teacher not found.')

  const [teacher, sessions] = await db.$transaction([
    db.teacher.update({ where: { id }, data: { isActive } }),
    // deactivating a teacher also disables their login
    db.user.updateMany({
      where: { teacherId: id },
      data: { isActive },
    }),
  ])

  if (!isActive) {
    const users = await db.user.findMany({ where: { teacherId: id }, select: { id: true } })
    for (const u of users) await destroyAllUserSessions(u.id)
  }
  return teacher
}

export async function setTeacherAssignments(
  teacherId: string,
  courseIds: string[],
  levelIds: string[]
): Promise<void> {
  const teacher = await db.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) throw new ApiError(404, 'Teacher not found.')

  // Validate levels belong to selected courses
  const levels = await db.level.findMany({ where: { id: { in: levelIds } }, select: { id: true, courseId: true } })
  const validCourseIds = new Set(courseIds)
  for (const level of levels) {
    if (!validCourseIds.has(level.courseId)) {
      throw new ApiError(422, 'Assigned levels must belong to the assigned courses.')
    }
  }

  await db.$transaction([
    db.teacherCourse.deleteMany({ where: { teacherId } }),
    db.teacherLevel.deleteMany({ where: { teacherId } }),
    db.teacherCourse.createMany({
      data: courseIds.map((courseId) => ({ teacherId, courseId })),
      skipDuplicates: true,
    }),
    db.teacherLevel.createMany({
      data: levelIds.map((levelId) => ({ teacherId, levelId })),
      skipDuplicates: true,
    }),
  ])
}

/** Manage the login account of a teacher. */
export async function manageTeacherAccount(
  teacherId: string,
  action: 'CREATE' | 'RESET_PASSWORD' | 'DEACTIVATE' | 'ACTIVATE',
  username: string,
  password: string
): Promise<{ username: string }> {
  const teacher = await db.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) throw new ApiError(404, 'Teacher not found.')

  const existing = await db.user.findFirst({ where: { teacherId } })

  if (action === 'CREATE') {
    if (existing) throw new ApiError(409, 'This teacher already has a login account.')
    const taken = await db.user.findUnique({ where: { username } })
    if (taken) throw new ApiError(409, `Username "${username}" is already taken.`)
    await db.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        role: 'TEACHER',
        isActive: true,
        teacherId,
      },
    })
    return { username }
  }

  if (!existing) throw new ApiError(404, 'This teacher has no login account.')

  if (action === 'RESET_PASSWORD') {
    if (password.length < 8) throw new ApiError(422, 'Password must be at least 8 characters.')
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(password) },
    })
    await destroyAllUserSessions(existing.id)
    return { username: existing.username }
  }

  if (action === 'DEACTIVATE') {
    await db.user.update({ where: { id: existing.id }, data: { isActive: false } })
    await destroyAllUserSessions(existing.id)
    return { username: existing.username }
  }

  // ACTIVATE
  await db.user.update({ where: { id: existing.id }, data: { isActive: true } })
  return { username: existing.username }
}

/** Teacher options for dropdowns (id, name) */
export async function teacherOptions() {
  return db.teacher.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  })
}
