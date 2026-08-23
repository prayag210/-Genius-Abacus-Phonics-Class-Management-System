/**
 * Homework service — assignments + submission tracking.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'

const homeworkInclude = {
  course: { select: { id: true, name: true } },
  level: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true } },
  createdBy: { select: { fullName: true } },
  _count: { select: { submissions: true } },
} satisfies Prisma.HomeworkInclude

export type HomeworkWithRelations = Prisma.HomeworkGetPayload<{ include: typeof homeworkInclude }>

export async function listHomework(params?: {
  batchId?: string
  teacherId?: string
}): Promise<HomeworkWithRelations[]> {
  return db.homework.findMany({
    where: {
      ...(params?.batchId ? { batchId: params.batchId } : {}),
      ...(params?.teacherId ? { createdById: params.teacherId } : {}),
    },
    include: homeworkInclude,
    orderBy: { dueDate: 'desc' },
  })
}

export async function createHomework(input: {
  title: string
  description: string | null
  courseId: string | null
  levelId: string | null
  batchId: string | null
  dueDate: Date
  createdById: string | null
}) {
  if (input.courseId) {
    const course = await db.course.findUnique({ where: { id: input.courseId } })
    if (!course) throw new ApiError(404, 'Course not found.')
  }
  if (input.levelId) {
    const level = await db.level.findUnique({ where: { id: input.levelId } })
    if (!level || level.courseId !== input.courseId) {
      throw new ApiError(422, 'Selected level does not belong to the selected course.')
    }
  }
  const batch = input.batchId
    ? await db.batch.findUnique({ where: { id: input.batchId } })
    : null
  if (input.batchId && !batch) throw new ApiError(404, 'Batch not found.')

  const homework = await db.homework.create({ data: input, include: homeworkInclude })

  // Auto-create PENDING submissions for all batch students
  if (batch) {
    const members = await db.batchStudent.findMany({
      where: { batchId: batch.id },
      select: { studentId: true },
    })
    if (members.length > 0) {
      await db.homeworkSubmission.createMany({
        data: members.map((m) => ({
          homeworkId: homework.id,
          studentId: m.studentId,
        })),
        skipDuplicates: true,
      })
    }
  }

  return homework
}

export async function deleteHomework(id: string) {
  await db.homework.delete({ where: { id } }) // submissions cascade
}

export async function getHomeworkDetail(id: string) {
  return db.homework.findUnique({
    where: { id },
    include: {
      course: { select: { name: true } },
      level: { select: { name: true } },
      batch: { select: { name: true } },
      createdBy: { select: { fullName: true } },
      submissions: {
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { student: { fullName: 'asc' } },
      },
    },
  })
}

/** Update a submission status (submitted / reviewed). */
export async function updateSubmission(
  homeworkId: string,
  studentId: string,
  status: 'PENDING' | 'SUBMITTED' | 'REVIEWED',
  remarks?: string | null
) {
  const existing = await db.homeworkSubmission.findUnique({
    where: { homeworkId_studentId: { homeworkId, studentId } },
  })
  if (existing) {
    return db.homeworkSubmission.update({
      where: { id: existing.id },
      data: {
        status,
        remarks: remarks ?? existing.remarks,
        submittedAt: status === 'SUBMITTED' && !existing.submittedAt ? new Date() : existing.submittedAt,
        reviewedAt: status === 'REVIEWED' ? new Date() : existing.reviewedAt,
      },
    })
  }
  return db.homeworkSubmission.create({
    data: {
      homeworkId,
      studentId,
      status,
      remarks: remarks ?? null,
      submittedAt: status === 'SUBMITTED' ? new Date() : null,
      reviewedAt: status === 'REVIEWED' ? new Date() : null,
    },
  })
}
