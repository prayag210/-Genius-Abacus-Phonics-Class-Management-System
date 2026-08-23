import { z } from 'zod'
import { optionalString, requiredString } from './shared'

export const teacherCreateSchema = z.object({
  fullName: requiredString('Full name', 120),
  photoUrl: optionalString(500),
  phone: optionalString(20),
  email: optionalString(120).refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Invalid email address'
  ),
  address: optionalString(500),
  branch: optionalString(200),
  qualification: optionalString(200),
  experience: optionalString(200),
  bio: optionalString(2000),
  // Optional login account creation
  createLogin: z.boolean().optional().default(false),
  username: optionalString(60),
  password: optionalString(128),
})
export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>

export const teacherUpdateSchema = teacherCreateSchema.omit({
  createLogin: true,
  username: true,
  password: true,
})
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>

export const teacherQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).optional().default('ALL'),
  courseId: z.string().optional(),
})

export const teacherAssignmentsSchema = z.object({
  courseIds: z.array(z.string()).max(50).default([]),
  levelIds: z.array(z.string()).max(200).default([]),
})

export const teacherAccountSchema = z.object({
  username: requiredString('Username', 60)
    .refine((v) => /^[a-z0-9_.-]+$/.test(v), 'Username can contain lowercase letters, numbers, dot, hyphen and underscore only')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  action: z.enum(['CREATE', 'RESET_PASSWORD', 'DEACTIVATE', 'ACTIVATE']).default('CREATE'),
})
