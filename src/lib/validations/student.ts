import { z } from 'zod'
import { optionalString, requiredString, optionalIsoDate, isoDate, STUDENT_STATUSES } from './shared'

export const parentCreateSchema = z.object({
  name: requiredString('Parent name', 120),
  phone: optionalString(20),
  email: optionalString(120).refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Invalid email address'
  ),
  address: optionalString(500),
  relationship: optionalString(60),
  notes: optionalString(2000),
})
export type ParentCreateInput = z.infer<typeof parentCreateSchema>

export const studentCreateSchema = z.object({
  fullName: requiredString('Student name', 120),
  dateOfBirth: optionalIsoDate,
  gender: optionalString(20),
  phone: optionalString(20),
  email: optionalString(120).refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Invalid email address'
  ),
  address: optionalString(500),
  parentId: optionalString(50),
  emergencyContactName: optionalString(120),
  emergencyContactPhone: optionalString(20),
  admissionDate: optionalIsoDate,
  status: z.enum(STUDENT_STATUSES).default('ACTIVE'),
  notes: optionalString(2000),
  photoUrl: optionalString(500),
  // Initial enrollment (optional)
  initialEnrollment: z
    .object({
      courseId: requiredString('Course', 50),
      levelId: optionalString(50),
      teacherId: optionalString(50),
      startDate: optionalIsoDate,
      createFeeRecord: z.boolean().default(true),
    })
    .optional()
    .nullable(),
})
export type StudentCreateInput = z.infer<typeof studentCreateSchema>

export const studentUpdateSchema = z.object({
  fullName: requiredString('Student name', 120),
  dateOfBirth: optionalIsoDate,
  gender: optionalString(20),
  phone: optionalString(20),
  email: optionalString(120).refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Invalid email address'
  ),
  address: optionalString(500),
  parentId: optionalString(50),
  emergencyContactName: optionalString(120),
  emergencyContactPhone: optionalString(20),
  admissionDate: optionalIsoDate,
  status: z.enum(STUDENT_STATUSES),
  notes: optionalString(2000),
  photoUrl: optionalString(500),
})

export const studentQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
  courseId: z.string().optional(),
  teacherId: z.string().optional(),
  batchId: z.string().optional(),
  parentId: z.string().optional(),
})
