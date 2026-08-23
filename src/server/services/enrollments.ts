/**
 * Enrollment & level progression service.
 *
 * Level progression rules:
 *  - A StudentLevel row exists per (enrollment, level) — the permanent history.
 *  - Moving to the next level marks the current row COMPLETED (with date,
 *    result, teacher) and creates the next level's row as IN_PROGRESS.
 *  - Enrollment.currentLevelId always points to the active level.
 *  - A FeeRecord is created for each new level (₹ fee comes from the level).
 *  - Nothing is ever deleted.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'
import type { EnrollmentCreateInput } from '@/lib/validations/enrollment'

const enrollmentInclude = {
  student: { select: { id: true, fullName: true, status: true, phone: true } },
  course: { select: { id: true, name: true } },
  currentLevel: { select: { id: true, name: true, levelNumber: true } },
  teacher: { select: { id: true, fullName: true } },
  batch: { select: { id: true, name: true } },
} satisfies Prisma.EnrollmentInclude

export type EnrollmentWithRelations = Prisma.EnrollmentGetPayload<{ include: typeof enrollmentInclude }>

export async function listEnrollments(params?: {
  studentId?: string
  teacherId?: string
  courseId?: string
  status?: string
}): Promise<EnrollmentWithRelations[]> {
  return db.enrollment.findMany({
    where: {
      ...(params?.studentId ? { studentId: params.studentId } : {}),
      ...(params?.teacherId ? { teacherId: params.teacherId } : {}),
      ...(params?.courseId ? { courseId: params.courseId } : {}),
      ...(params?.status && params.status !== 'ALL' ? { status: params.status as never } : {}),
    },
    include: enrollmentInclude,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEnrollment(id: string) {
  return db.enrollment.findUnique({
    where: { id },
    include: {
      ...enrollmentInclude,
      studentLevels: {
        include: {
          level: { select: { id: true, name: true, levelNumber: true } },
          teacher: { select: { fullName: true } },
        },
        orderBy: { level: { levelNumber: 'asc' } },
      },
      feeRecords: {
        include: { level: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        include: { feeRecord: { include: { level: { select: { name: true } } } } },
      },
      certificates: true,
      skillRatings: {
        orderBy: { date: 'desc' },
        include: { ratedBy: { select: { fullName: true } } },
      },
      course: {
        select: {
          id: true,
          name: true,
          levels: { where: { isActive: true }, orderBy: { levelNumber: 'asc' } },
        },
      },
    },
  })
}

export async function createEnrollment(input: EnrollmentCreateInput) {
  const student = await db.student.findUnique({ where: { id: input.studentId } })
  if (!student) throw new ApiError(404, 'Student not found.')

  const course = await db.course.findUnique({
    where: { id: input.courseId },
    include: { levels: { where: { isActive: true }, orderBy: { levelNumber: 'asc' } } },
  })
  if (!course) throw new ApiError(404, 'Course not found.')

  const existing = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: input.studentId, courseId: input.courseId } },
  })
  if (existing) {
    throw new ApiError(409, `${student.fullName} is already enrolled in ${course.name}.`)
  }

  let levelId = input.levelId ?? null
  if (levelId) {
    const level = await db.level.findUnique({ where: { id: levelId } })
    if (!level || level.courseId !== course.id) {
      throw new ApiError(422, 'Selected level does not belong to the selected course.')
    }
  } else if (course.levels.length > 0) {
    levelId = course.levels[0].id
  }

  return db.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: {
        studentId: input.studentId,
        courseId: input.courseId,
        currentLevelId: levelId,
        teacherId: input.teacherId ?? null,
        batchId: input.batchId ?? null,
        startDate: input.startDate ?? new Date(),
        status: 'ACTIVE',
      },
      include: enrollmentInclude,
    })

    if (levelId) {
      const existingHistory = await tx.studentLevel.findUnique({
        where: { enrollmentId_levelId: { enrollmentId: enrollment.id, levelId } },
      })
      if (!existingHistory) {
        await tx.studentLevel.create({
          data: {
            enrollmentId: enrollment.id,
            studentId: input.studentId,
            levelId,
            status: 'IN_PROGRESS',
            teacherId: input.teacherId ?? null,
          },
        })
      }
      if (input.createFeeRecord) {
        const level = course.levels.find((l) => l.id === levelId)
        if (level) {
          const feeExists = await tx.feeRecord.findUnique({
            where: { enrollmentId_levelId: { enrollmentId: enrollment.id, levelId } },
          })
          if (!feeExists) {
            await tx.feeRecord.create({
              data: {
                studentId: input.studentId,
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

    return enrollment
  })
}

export async function updateEnrollment(
  id: string,
  input: { currentLevelId?: string | null; teacherId?: string | null; batchId?: string | null; status?: 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'ON_HOLD' }
) {
  const existing = await db.enrollment.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Enrollment not found.')

  if (input.currentLevelId) {
    const level = await db.level.findUnique({ where: { id: input.currentLevelId } })
    if (!level || level.courseId !== existing.courseId) {
      throw new ApiError(422, 'Selected level does not belong to this enrollment course.')
    }
  }

  return db.$transaction(async (tx) => {
    // If changing current level, ensure a StudentLevel history row exists
    if (input.currentLevelId && input.currentLevelId !== existing.currentLevelId) {
      const hist = await tx.studentLevel.findUnique({
        where: { enrollmentId_levelId: { enrollmentId: id, levelId: input.currentLevelId } },
      })
      if (!hist) {
        await tx.studentLevel.create({
          data: {
            enrollmentId: id,
            studentId: existing.studentId,
            levelId: input.currentLevelId,
            status: 'IN_PROGRESS',
          },
        })
      } else if (hist.status === 'NOT_STARTED') {
        await tx.studentLevel.update({
          where: { id: hist.id },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        })
      }
    }

    return tx.enrollment.update({
      where: { id },
      data: {
        ...(input.currentLevelId !== undefined ? { currentLevelId: input.currentLevelId } : {}),
        ...(input.teacherId !== undefined ? { teacherId: input.teacherId } : {}),
        ...(input.batchId !== undefined ? { batchId: input.batchId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: enrollmentInclude,
    })
  })
}

/**
 * Complete the current level and optionally progress to the next level.
 * History is always preserved.
 */
export async function completeLevel(input: {
  enrollmentId: string
  result: string | null
  nextLevelId?: string | null
  completeCourse: boolean
  teacherId?: string | null
}) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: input.enrollmentId },
    include: {
      course: {
        select: { id: true, name: true, levels: { where: { isActive: true }, orderBy: { levelNumber: 'asc' } } },
      },
    },
  })
  if (!enrollment) throw new ApiError(404, 'Enrollment not found.')

  if (!enrollment.currentLevelId) {
    throw new ApiError(422, 'This enrollment has no current level to complete.')
  }

  const currentHistory = await db.studentLevel.findUnique({
    where: {
      enrollmentId_levelId: { enrollmentId: enrollment.id, levelId: enrollment.currentLevelId },
    },
  })
  if (currentHistory?.status === 'COMPLETED') {
    throw new ApiError(422, 'The current level is already completed.')
  }

  // Determine the next level
  let nextLevelId = input.nextLevelId ?? null
  if (!input.completeCourse) {
    if (!nextLevelId) {
      const idx = enrollment.course.levels.findIndex((l) => l.id === enrollment.currentLevelId)
      nextLevelId = enrollment.course.levels[idx + 1]?.id ?? null
    }
    if (!nextLevelId) {
      throw new ApiError(
        422,
        'There is no next level in this course. Tick "complete the course" if this is the final level.'
      )
    }
    const nextLevel = await db.level.findUnique({ where: { id: nextLevelId } })
    if (!nextLevel || nextLevel.courseId !== enrollment.courseId) {
      throw new ApiError(422, 'The next level does not belong to this course.')
    }
  }

  return db.$transaction(async (tx) => {
    // 1. Complete current level (preserve history)
    if (currentHistory) {
      await tx.studentLevel.update({
        where: { id: currentHistory.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: input.result,
          teacherId: input.teacherId ?? currentHistory.teacherId,
        },
      })
    } else {
      await tx.studentLevel.create({
        data: {
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          levelId: enrollment.currentLevelId,
          status: 'COMPLETED',
          startedAt: enrollment.startDate,
          completedAt: new Date(),
          result: input.result,
          teacherId: input.teacherId ?? null,
        },
      })
    }

    // 2. Move to next level or complete course
    if (input.completeCourse || !nextLevelId) {
      const updated = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED' },
        include: enrollmentInclude,
      })
      return { enrollment: updated, nextLevelName: null }
    }

    const existingNext = await tx.studentLevel.findUnique({
      where: { enrollmentId_levelId: { enrollmentId: enrollment.id, levelId: nextLevelId } },
    })
    if (existingNext) {
      await tx.studentLevel.update({
        where: { id: existingNext.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      })
    } else {
      await tx.studentLevel.create({
        data: {
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          levelId: nextLevelId,
          status: 'IN_PROGRESS',
          teacherId: input.teacherId ?? enrollment.teacherId ?? null,
        },
      })
    }

    // 3. Create fee record for the new level (₹ fee from the level itself)
    const nextLevel = await tx.level.findUnique({ where: { id: nextLevelId } })
    if (nextLevel) {
      const feeExists = await tx.feeRecord.findUnique({
        where: { enrollmentId_levelId: { enrollmentId: enrollment.id, levelId: nextLevelId } },
      })
      if (!feeExists) {
        await tx.feeRecord.create({
          data: {
            studentId: enrollment.studentId,
            enrollmentId: enrollment.id,
            levelId: nextLevelId,
            totalFee: nextLevel.fee,
            paidAmount: 0,
            status: 'PENDING',
          },
        })
      }
    }

    const updated = await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { currentLevelId: nextLevelId },
      include: enrollmentInclude,
    })
    return { enrollment: updated, nextLevelName: nextLevel?.name ?? null }
  })
}

/** Full level ladder view for a student's enrollment. */
export async function getLevelLadder(enrollmentId: string) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: {
        select: { levels: { where: { isActive: true }, orderBy: { levelNumber: 'asc' } } },
      },
      studentLevels: true,
    },
  })
  if (!enrollment) throw new ApiError(404, 'Enrollment not found.')

  return enrollment.course.levels.map((level) => {
    const history = enrollment.studentLevels.find((sl) => sl.levelId === level.id)
    return {
      levelId: level.id,
      levelNumber: level.levelNumber,
      name: level.name,
      fee: Number(level.fee),
      status: history?.status ?? 'NOT_STARTED',
      startedAt: history?.startedAt ?? null,
      completedAt: history?.completedAt ?? null,
      result: history?.result ?? null,
      isCurrent: enrollment.currentLevelId === level.id,
    }
  })
}
