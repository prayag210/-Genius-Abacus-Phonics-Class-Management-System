import { z } from 'zod'
import { optionalString, requiredString, optionalIsoDate } from './shared'

export const enrollmentCreateSchema = z.object({
  studentId: requiredString('Student', 50),
  courseId: requiredString('Course', 50),
  levelId: optionalString(50),
  teacherId: optionalString(50),
  batchId: optionalString(50),
  startDate: optionalIsoDate,
  createFeeRecord: z.boolean().default(true),
})
export type EnrollmentCreateInput = z.infer<typeof enrollmentCreateSchema>

export const enrollmentUpdateSchema = z.object({
  currentLevelId: optionalString(50),
  teacherId: optionalString(50),
  batchId: optionalString(50),
  status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED', 'ON_HOLD']).optional(),
})

/**
 * Complete the student's current level and move to the next one.
 * History is preserved — the completed StudentLevel row is updated, never deleted.
 */
export const progressionSchema = z.object({
  enrollmentId: requiredString('Enrollment', 50),
  result: optionalString(200),
  nextLevelId: optionalString(50),
  completeCourse: z.boolean().default(false),
})
