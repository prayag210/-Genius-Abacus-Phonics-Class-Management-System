/**
 * Batch service — CRUD, student membership, schedule conflict checks.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'
import type { BatchCreateInput } from '@/lib/validations/batch'

const batchInclude = {
  course: { select: { id: true, name: true } },
  level: { select: { id: true, name: true } },
  teacher: { select: { id: true, fullName: true } },
  _count: { select: { students: true } },
} satisfies Prisma.BatchInclude

export type BatchWithRelations = Prisma.BatchGetPayload<{ include: typeof batchInclude }>

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseDays(days: string): number[] {
  return days
    .split(',')
    .map((d) => d.trim())
    .filter((d): d is string => DAYS.includes(d))
    .map((d) => DAYS.indexOf(d))
}

/** Check whether day/time windows overlap. */
function overlaps(
  a: { days: string; startTime: string; endTime: string },
  b: { days: string; startTime: string; endTime: string }
): boolean {
  const aDays = parseDays(a.days)
  const bDays = parseDays(b.days)
  if (!aDays.some((d) => bDays.includes(d))) return false
  return a.startTime < b.endTime && b.startTime < a.endTime
}

export async function listBatches(params?: {
  courseId?: string
  teacherId?: string
  includeInactive?: boolean
}): Promise<BatchWithRelations[]> {
  return db.batch.findMany({
    where: {
      ...(params?.courseId ? { courseId: params.courseId } : {}),
      ...(params?.teacherId ? { teacherId: params.teacherId } : {}),
      ...(params?.includeInactive === false ? { isActive: true } : {}),
    },
    include: batchInclude,
    orderBy: [{ isActive: 'desc' }, { startTime: 'asc' }],
  })
}

export async function getBatch(id: string): Promise<BatchWithRelations | null> {
  return db.batch.findUnique({ where: { id }, include: batchInclude })
}

/** Students in the batch + candidate students for adding. */
export async function getBatchStudents(batchId: string) {
  const members = await db.batchStudent.findMany({
    where: { batchId },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { course: { select: { name: true } }, currentLevel: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { student: { fullName: 'asc' } },
  })
  return members.map((m) => m.student)
}

export async function createBatch(input: BatchCreateInput): Promise<BatchWithRelations> {
  const course = await db.course.findUnique({ where: { id: input.courseId } })
  if (!course) throw new ApiError(404, 'Course not found.')
  if (input.levelId) {
    const level = await db.level.findUnique({ where: { id: input.levelId } })
    if (!level || level.courseId !== input.courseId) {
      throw new ApiError(422, 'Selected level does not belong to the selected course.')
    }
  }
  if (input.teacherId) {
    const teacher = await db.teacher.findUnique({ where: { id: input.teacherId } })
    if (!teacher || !teacher.isActive) throw new ApiError(422, 'Selected teacher is not available.')
  }
  if (input.startTime >= input.endTime) {
    throw new ApiError(422, 'End time must be after start time.')
  }

  return db.batch.create({ data: input, include: batchInclude })
}

export async function updateBatch(
  id: string,
  input: BatchCreateInput & { isActive?: boolean }
): Promise<BatchWithRelations> {
  const existing = await db.batch.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Batch not found.')
  if (input.startTime >= input.endTime) {
    throw new ApiError(422, 'End time must be after start time.')
  }
  if (input.levelId) {
    const level = await db.level.findUnique({ where: { id: input.levelId } })
    if (!level || level.courseId !== input.courseId) {
      throw new ApiError(422, 'Selected level does not belong to the selected course.')
    }
  }
  return db.batch.update({
    where: { id },
    data: { ...input, levelId: input.levelId ?? null, teacherId: input.teacherId ?? null },
    include: batchInclude,
  })
}

export async function deleteBatch(id: string): Promise<void> {
  const [attendance, homework] = await Promise.all([
    db.attendance.count({ where: { batchId: id } }),
    db.homework.count({ where: { batchId: id } }),
  ])
  if (attendance + homework > 0) {
    throw new ApiError(
      409,
      `This batch has ${attendance} attendance record(s) and ${homework} homework. Deactivate it instead of deleting.`
    )
  }
  await db.batch.delete({ where: { id } })
}

/**
 * Add students to a batch with conflict detection:
 * - capacity check
 * - day/time conflict with the student's other batches
 */
export async function addStudentsToBatch(
  batchId: string,
  studentIds: string[]
): Promise<{ added: number; warnings: string[] }> {
  const batch = await db.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw new ApiError(404, 'Batch not found.')

  const existingCount = await db.batchStudent.count({ where: { batchId } })
  const capacity = batch.maxStudents - existingCount
  if (studentIds.length > capacity) {
    throw new ApiError(422, `Only ${Math.max(capacity, 0)} seat(s) available in this batch.`)
  }

  const warnings: string[] = []
  let added = 0

  for (const studentId of studentIds) {
    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) continue

    // conflict check against student's other batches
    const otherBatches = await db.batchStudent.findMany({
      where: { studentId, batch: { isActive: true } },
      include: { batch: true },
    })
    const conflict = otherBatches.find(({ batch: b }) => overlaps(batch, b))
    if (conflict) {
      warnings.push(
        `${student.fullName} already has "${conflict.batch.name}" on an overlapping schedule (${conflict.batch.days}, ${conflict.batch.startTime}–${conflict.batch.endTime}).`
      )
    }

    try {
      await db.batchStudent.create({ data: { batchId, studentId } })
      added++
    } catch {
      warnings.push(`${student.fullName} is already in this batch.`)
    }
  }

  return { added, warnings }
}

export async function removeStudentFromBatch(batchId: string, studentId: string): Promise<void> {
  await db.batchStudent.delete({
    where: { batchId_studentId: { batchId, studentId } },
  })
}

/** Batches for a given day (IST), used for attendance and today's classes. */
export async function batchesForDay(dateISO: string, teacherId?: string) {
  const d = new Date(`${dateISO}T00:00:00.000Z`)
  const dayName = DAYS[d.getUTCDay()]
  const batches = await db.batch.findMany({
    where: {
      isActive: true,
      ...(teacherId ? { teacherId } : {}),
    },
    include: {
      course: { select: { name: true } },
      level: { select: { name: true } },
      teacher: { select: { fullName: true } },
      _count: { select: { students: true } },
    },
    orderBy: { startTime: 'asc' },
  })
  return batches.filter((b) => b.days.split(',').map((x) => x.trim()).includes(dayName))
}
