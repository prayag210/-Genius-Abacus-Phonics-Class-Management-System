import { z } from 'zod'
import { optionalString, requiredString, TIME_REGEX } from './shared'

export const batchCreateSchema = z.object({
  name: requiredString('Batch name', 100),
  courseId: requiredString('Course', 50),
  levelId: optionalString(50),
  teacherId: optionalString(50),
  days: requiredString('Days', 60).refine(
    (v) => v.split(',').every((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(d.trim())),
    'Invalid day selection'
  ),
  startTime: z.string().regex(TIME_REGEX, 'Invalid time'),
  endTime: z.string().regex(TIME_REGEX, 'Invalid time'),
  room: optionalString(50),
  maxStudents: z.coerce.number().int().min(1).max(200).default(20),
})
export type BatchCreateInput = z.infer<typeof batchCreateSchema>

export const batchUpdateSchema = batchCreateSchema.extend({
  isActive: z.boolean().optional(),
})

export const batchStudentSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'Select at least one student').max(200),
})

export const attendanceSaveSchema = z.object({
  batchId: requiredString('Batch', 50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
        remarks: optionalString(200),
      })
    )
    .min(1, 'No attendance records submitted'),
})
