/**
 * Course & Level service.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Course, Level, Prisma } from '@prisma/client'
import type { CourseCreateInput, LevelCreateInput } from '@/lib/validations/course'

const courseInclude = {
  levels: {
    orderBy: { levelNumber: 'asc' as const },
    select: {
      id: true,
      levelNumber: true,
      name: true,
      fee: true,
      isActive: true,
      duration: true,
      description: true,
    },
  },
  _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
} satisfies Prisma.CourseInclude

export type CourseWithLevels = Prisma.CourseGetPayload<{ include: typeof courseInclude }>

export async function listCourses(includeInactive = true): Promise<CourseWithLevels[]> {
  return db.course.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: courseInclude,
    orderBy: { name: 'asc' },
  })
}

export async function getCourse(id: string): Promise<CourseWithLevels | null> {
  return db.course.findUnique({ where: { id }, include: courseInclude })
}

export async function createCourse(input: CourseCreateInput): Promise<Course> {
  const exists = await db.course.findUnique({ where: { name: input.name } })
  if (exists) throw new ApiError(409, `A course named "${input.name}" already exists.`)
  return db.course.create({ data: input })
}

export async function updateCourse(
  id: string,
  input: { name: string; description: string | null; defaultFeePerLevel: number; isActive?: boolean }
): Promise<Course> {
  const existing = await db.course.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Course not found.')
  const nameTaken = await db.course.findFirst({ where: { name: input.name, NOT: { id } } })
  if (nameTaken) throw new ApiError(409, `A course named "${input.name}" already exists.`)
  return db.course.update({ where: { id }, data: input })
}

export async function canDeleteCourse(id: string): Promise<{ ok: boolean; reason?: string }> {
  const [enrollments, batches, tests] = await Promise.all([
    db.enrollment.count({ where: { courseId: id } }),
    db.batch.count({ where: { courseId: id } }),
    db.test.count({ where: { courseId: id } }),
  ])
  if (enrollments + batches + tests > 0) {
    return {
      ok: false,
      reason: `This course has ${enrollments} enrollment(s), ${batches} batch(es) and ${tests} test(s). Deactivate it instead of deleting.`,
    }
  }
  return { ok: true }
}

export async function deleteCourse(id: string): Promise<void> {
  const safety = await canDeleteCourse(id)
  if (!safety.ok) throw new ApiError(409, safety.reason ?? 'This course cannot be deleted safely.')
  await db.course.delete({ where: { id } }) // levels cascade
}

// ---------- Levels ----------

export type LevelWithCourse = Level & {
  course: { id: string; name: string }
  _count?: { enrollments: number; feeRecords: number; batches: number }
}

export async function listLevels(params?: { courseId?: string; includeInactive?: boolean }): Promise<
  (Level & { course: { id: string; name: string }; _count: { enrollments: number; batches: number } })[]
> {
  return db.level.findMany({
    where: {
      ...(params?.courseId ? { courseId: params.courseId } : {}),
      ...(params?.includeInactive === false ? { isActive: true } : {}),
    },
    include: {
      course: { select: { id: true, name: true } },
      _count: { select: { enrollments: { where: { status: 'ACTIVE' } }, batches: true } },
    },
    orderBy: [{ course: { name: 'asc' } }, { levelNumber: 'asc' }],
  })
}

export async function createLevel(input: LevelCreateInput): Promise<Level> {
  const course = await db.course.findUnique({ where: { id: input.courseId } })
  if (!course) throw new ApiError(404, 'Course not found.')
  const dup = await db.level.findUnique({
    where: { courseId_levelNumber: { courseId: input.courseId, levelNumber: input.levelNumber } },
  })
  if (dup) throw new ApiError(409, `Level number ${input.levelNumber} already exists in this course.`)
  return db.level.create({ data: input })
}

export async function updateLevel(
  id: string,
  input: Omit<LevelCreateInput, 'courseId'> & { isActive?: boolean }
): Promise<Level> {
  const existing = await db.level.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Level not found.')
  if (input.levelNumber !== existing.levelNumber) {
    const dup = await db.level.findUnique({
      where: {
        courseId_levelNumber: { courseId: existing.courseId, levelNumber: input.levelNumber },
      },
    })
    if (dup) throw new ApiError(409, `Level number ${input.levelNumber} already exists in this course.`)
  }
  return db.level.update({
    where: { id },
    data: {
      levelNumber: input.levelNumber,
      name: input.name,
      description: input.description,
      duration: input.duration,
      fee: input.fee,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })
}

export async function deleteLevel(id: string): Promise<void> {
  const [feeRecords, studentLevels, enrollments, batches] = await Promise.all([
    db.feeRecord.count({ where: { levelId: id } }),
    db.studentLevel.count({ where: { levelId: id } }),
    db.enrollment.count({ where: { currentLevelId: id } }),
    db.batch.count({ where: { levelId: id } }),
  ])
  if (feeRecords + studentLevels + batches > 0) {
    throw new ApiError(
      409,
      `This level has ${feeRecords} fee record(s), ${studentLevels} student progression record(s) and ${batches} batch(es). Deactivate it instead of deleting.`
    )
  }
  if (enrollments > 0) {
    await db.enrollment.updateMany({ where: { currentLevelId: id }, data: { currentLevelId: null } })
  }
  await db.level.delete({ where: { id } })
}

export async function courseOptions() {
  return db.course.findMany({
    where: { isActive: true },
    select: { id: true, name: true, defaultFeePerLevel: true },
    orderBy: { name: 'asc' },
  })
}
