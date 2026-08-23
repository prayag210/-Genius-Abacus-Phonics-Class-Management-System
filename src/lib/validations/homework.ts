import { z } from 'zod'
import { optionalString, requiredString, isoDate } from './shared'

export const homeworkCreateSchema = z.object({
  title: requiredString('Title', 150),
  description: optionalString(2000),
  courseId: optionalString(50),
  levelId: optionalString(50),
  batchId: optionalString(50),
  dueDate: isoDate,
})
export type HomeworkCreateInput = z.infer<typeof homeworkCreateSchema>

export const submissionUpdateSchema = z.object({
  studentId: requiredString('Student', 50),
  status: z.enum(['PENDING', 'SUBMITTED', 'REVIEWED']),
  remarks: optionalString(500),
})
