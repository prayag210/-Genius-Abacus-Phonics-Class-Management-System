import { z } from 'zod'
import { optionalString, requiredString, isoDate, ATTENDANCE_STATUSES } from './shared'

export const testCreateSchema = z.object({
  name: requiredString('Test name', 150),
  courseId: requiredString('Course', 50),
  levelId: optionalString(50),
  batchId: optionalString(50),
  date: isoDate,
  totalMarks: z.coerce.number().int().min(1).max(1000),
  passingMarks: z.coerce.number().int().min(0).max(1000),
})
export type TestCreateInput = z.infer<typeof testCreateSchema>

export const testResultSchema = z.object({
  results: z
    .array(
      z.object({
        studentId: z.string().min(1),
        marks: z.coerce.number().min(0).max(1000),
        comment: optionalString(500),
      })
    )
    .min(1, 'Add at least one result'),
})

export const skillRatingSchema = z.object({
  studentId: requiredString('Student', 50),
  enrollmentId: optionalString(50),
  skillName: requiredString('Skill', 100),
  rating: z.coerce.number().int().min(1).max(5),
  notes: optionalString(500),
  date: isoDate,
})

export const teacherNoteSchema = z.object({
  studentId: requiredString('Student', 50),
  note: requiredString('Note', 2000),
  date: isoDate,
})
