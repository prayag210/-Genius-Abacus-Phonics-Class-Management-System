/**
 * Tests, results, skill ratings and teacher notes.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'
import type { TestCreateInput } from '@/lib/validations/test'

const testInclude = {
  course: { select: { id: true, name: true } },
  level: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true } },
  createdBy: { select: { username: true } },
  _count: { select: { results: true } },
} satisfies Prisma.TestInclude

export type TestWithRelations = Prisma.TestGetPayload<{ include: typeof testInclude }>

export async function listTests(params?: {
  courseId?: string
  teacherBatchIds?: string[]
}): Promise<TestWithRelations[]> {
  return db.test.findMany({
    where: {
      ...(params?.courseId ? { courseId: params.courseId } : {}),
      ...(params?.teacherBatchIds ? { batchId: { in: params.teacherBatchIds } } : {}),
    },
    include: testInclude,
    orderBy: { date: 'desc' },
  })
}

export async function getTest(id: string) {
  return db.test.findUnique({
    where: { id },
    include: {
      course: { select: { name: true } },
      level: { select: { name: true } },
      batch: { select: { id: true, name: true } },
      results: {
        include: {
          student: { select: { id: true, fullName: true } },
          teacher: { select: { fullName: true } },
        },
        orderBy: { student: { fullName: 'asc' } },
      },
    },
  })
}

export async function createTest(input: TestCreateInput, createdById: string) {
  const course = await db.course.findUnique({ where: { id: input.courseId } })
  if (!course) throw new ApiError(404, 'Course not found.')
  if (input.levelId) {
    const level = await db.level.findUnique({ where: { id: input.levelId } })
    if (!level || level.courseId !== input.courseId) {
      throw new ApiError(422, 'Selected level does not belong to the selected course.')
    }
  }
  if (input.passingMarks > input.totalMarks) {
    throw new ApiError(422, 'Passing marks cannot exceed total marks.')
  }
  return db.test.create({
    data: { ...input, createdById },
    include: testInclude,
  })
}

export async function deleteTest(id: string) {
  await db.test.delete({ where: { id } }) // results cascade
}

/** Save results for a test (upsert per student). */
export async function saveTestResults(
  testId: string,
  results: { studentId: string; marks: number; comment: string | null }[],
  teacherId: string | null
) {
  const test = await db.test.findUnique({ where: { id: testId } })
  if (!test) throw new ApiError(404, 'Test not found.')

  for (const r of results) {
    if (r.marks > test.totalMarks) {
      throw new ApiError(422, `Marks cannot exceed total marks (${test.totalMarks}).`)
    }
  }

  const passingPercentage = (await db.settings.findUnique({ where: { id: 'main' } }))?.passingPercentage
  const passingMarks = test.passingMarks || Math.ceil((Number(passingPercentage ?? 40) / 100) * test.totalMarks)

  await db.$transaction(
    results.map((r) => {
      const percentage = test.totalMarks > 0 ? Math.round((r.marks / test.totalMarks) * 10000) / 100 : 0
      const passed = r.marks >= passingMarks
      return db.testResult.upsert({
        where: { testId_studentId: { testId, studentId: r.studentId } },
        create: {
          testId,
          studentId: r.studentId,
          marks: r.marks,
          percentage,
          passed,
          comment: r.comment,
          teacherId,
        },
        update: {
          marks: r.marks,
          percentage,
          passed,
          comment: r.comment,
          teacherId,
        },
      })
    })
  )
  return { saved: results.length }
}

// ---------- Skill ratings ----------

export async function listSkillRatings(params: { studentId?: string; teacherId?: string }) {
  return db.skillRating.findMany({
    where: {
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.teacherId ? { ratedById: params.teacherId } : {}),
    },
    include: {
      student: { select: { id: true, fullName: true } },
      ratedBy: { select: { fullName: true } },
    },
    orderBy: { date: 'desc' },
    take: 200,
  })
}

export async function createSkillRating(input: {
  studentId: string
  enrollmentId?: string | null
  skillName: string
  rating: number
  notes?: string | null
  date: Date
  ratedById?: string | null
}) {
  const student = await db.student.findUnique({ where: { id: input.studentId } })
  if (!student) throw new ApiError(404, 'Student not found.')
  if (input.rating < 1 || input.rating > 5) throw new ApiError(422, 'Rating must be between 1 and 5.')
  return db.skillRating.create({ data: input })
}

/** Latest rating per skill for a student. */
export async function studentSkillSummary(studentId: string) {
  const ratings = await db.skillRating.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
  })
  const bySkill = new Map<string, { skillName: string; rating: number; date: Date; history: number[] }>()
  for (const r of ratings) {
    const existing = bySkill.get(r.skillName)
    if (!existing) {
      bySkill.set(r.skillName, { skillName: r.skillName, rating: r.rating, date: r.date, history: [r.rating] })
    } else {
      existing.history.push(r.rating)
    }
  }
  return Array.from(bySkill.values())
}

// ---------- Teacher notes ----------

export async function listTeacherNotes(studentId: string) {
  return db.teacherNote.findMany({
    where: { studentId },
    include: { teacher: { select: { fullName: true } } },
    orderBy: { date: 'desc' },
  })
}

export async function createTeacherNote(input: {
  studentId: string
  note: string
  date: Date
  teacherId: string
}) {
  const student = await db.student.findUnique({ where: { id: input.studentId } })
  if (!student) throw new ApiError(404, 'Student not found.')
  return db.teacherNote.create({ data: input })
}

export async function deleteTeacherNote(id: string, teacherId: string, isAdmin: boolean) {
  const note = await db.teacherNote.findUnique({ where: { id } })
  if (!note) throw new ApiError(404, 'Note not found.')
  if (!isAdmin && note.teacherId !== teacherId) {
    throw new ApiError(403, 'You can only delete your own notes.')
  }
  await db.teacherNote.delete({ where: { id } })
}
