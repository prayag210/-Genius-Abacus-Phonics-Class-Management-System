/**
 * Student service — CRUD + teacher-scoped access.
 *
 * Teachers only see/operate on students linked to them via enrollments.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma, Student } from '@prisma/client'
import type { StudentCreateInput } from '@/lib/validations/student'

const studentInclude = {
  parent: { select: { id: true, name: true, phone: true } },
  enrollments: {
    include: {
      course: { select: { id: true, name: true } },
      currentLevel: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
      batch: { select: { id: true, name: true } },
    },
  },
  batches: { include: { batch: { select: { id: true, name: true } } } },
  _count: {
    select: {
      attendance: { where: { status: 'PRESENT' } },
      testResults: true,
      certificates: true,
    },
  },
} satisfies Prisma.StudentInclude

export type StudentWithRelations = Prisma.StudentGetPayload<{ include: typeof studentInclude }>

/** Can this teacher access this student? Admins always can. */
export async function teacherCanAccessStudent(teacherId: string, studentId: string): Promise<boolean> {
  const enrollment = await db.enrollment.findFirst({
    where: { studentId, teacherId },
    select: { id: true },
  })
  if (enrollment) return true
  // also via batch assignment
  const batch = await db.batchStudent.findFirst({
    where: { studentId, batch: { teacherId } },
    select: { batchId: true },
  })
  return !!batch
}

export async function listStudents(params: {
  q?: string
  status?: string
  courseId?: string
  teacherId?: string
  batchId?: string
  parentId?: string
}): Promise<StudentWithRelations[]> {
  const where: Prisma.StudentWhereInput = {}

  if (params.q) {
    where.OR = [
      { fullName: { contains: params.q, mode: 'insensitive' } },
      { phone: { contains: params.q, mode: 'insensitive' } },
      { parent: { name: { contains: params.q, mode: 'insensitive' } } },
      { parent: { phone: { contains: params.q, mode: 'insensitive' } } },
    ]
  }
  if (params.status && params.status !== 'ALL') {
    where.status = params.status as never
  }
  if (params.parentId) where.parentId = params.parentId
  if (params.courseId || params.teacherId || params.batchId) {
    where.enrollments = {
      some: {
        ...(params.courseId ? { courseId: params.courseId } : {}),
        ...(params.teacherId ? { teacherId: params.teacherId } : {}),
        ...(params.batchId ? { batchId: params.batchId } : {}),
      },
    }
  }

  return db.student.findMany({
    where,
    include: studentInclude,
    orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
  })
}

export async function getStudent(id: string): Promise<StudentWithRelations | null> {
  return db.student.findUnique({ where: { id }, include: studentInclude })
}

export async function createStudent(input: StudentCreateInput): Promise<Student> {
  const { initialEnrollment, ...data } = input

  if (data.parentId) {
    const parent = await db.parent.findUnique({ where: { id: data.parentId } })
    if (!parent) throw new ApiError(422, 'Selected parent does not exist.')
  }

  return db.$transaction(async (tx) => {
    const student = await tx.student.create({ data })

    if (initialEnrollment?.courseId) {
      const course = await tx.course.findUnique({
        where: { id: initialEnrollment.courseId },
        include: { levels: { where: { isActive: true }, orderBy: { levelNumber: 'asc' } } },
      })
      if (!course) throw new ApiError(422, 'Selected course does not exist.')

      let levelId = initialEnrollment.levelId ?? null
      if (levelId) {
        const level = await tx.level.findUnique({ where: { id: levelId } })
        if (!level || level.courseId !== course.id) {
          throw new ApiError(422, 'Selected level does not belong to the selected course.')
        }
      } else if (course.levels.length > 0) {
        levelId = course.levels[0].id
      }

      const enrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          currentLevelId: levelId,
          teacherId: initialEnrollment.teacherId ?? null,
          batchId: initialEnrollment.batchId ?? null,
          startDate: initialEnrollment.startDate ?? new Date(),
          status: 'ACTIVE',
        },
      })

      if (levelId) {
        await tx.studentLevel.create({
          data: {
            enrollmentId: enrollment.id,
            studentId: student.id,
            levelId,
            status: 'IN_PROGRESS',
            teacherId: initialEnrollment.teacherId ?? null,
          },
        })
        if (initialEnrollment.createFeeRecord) {
          const level = course.levels.find((l) => l.id === levelId)
          if (level) {
            await tx.feeRecord.create({
              data: {
                studentId: student.id,
                enrollmentId: enrollment.id,
                levelId,
                totalFee: level.fee,
                paidAmount: 0,
                status: 'PENDING',
              },
            })
          }
        }
      }
    }

    return student
  })
}

export async function updateStudent(id: string, input: Omit<StudentCreateInput, 'initialEnrollment'>) {
  const existing = await db.student.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Student not found.')
  if (input.parentId) {
    const parent = await db.parent.findUnique({ where: { id: input.parentId } })
    if (!parent) throw new ApiError(422, 'Selected parent does not exist.')
  }
  return db.student.update({
    where: { id },
    data: { ...input, parentId: input.parentId ?? null },
  })
}

export async function deleteStudent(id: string): Promise<void> {
  const [payments, enrollments] = await Promise.all([
    db.payment.count({ where: { studentId: id } }),
    db.enrollment.count({ where: { studentId: id } }),
  ])
  if (payments > 0) {
    throw new ApiError(
      409,
      `This student has ${payments} payment record(s). Payment history must be preserved — set the student's status to "Left" instead of deleting.`
    )
  }
  if (enrollments > 0) {
    throw new ApiError(
      409,
      `This student has ${enrollments} enrollment(s) with progress and fee history. Set the status to "Left" instead of deleting.`
    )
  }
  await db.student.delete({ where: { id } })
}

export async function studentOptions() {
  return db.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  })
}
