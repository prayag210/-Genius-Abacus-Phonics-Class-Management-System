import { z } from 'zod'
import { optionalString, requiredString, money } from './shared'

export const courseCreateSchema = z.object({
  name: requiredString('Course name', 100),
  description: optionalString(2000),
  defaultFeePerLevel: money,
})
export type CourseCreateInput = z.infer<typeof courseCreateSchema>

export const courseUpdateSchema = z.object({
  name: requiredString('Course name', 100),
  description: optionalString(2000),
  defaultFeePerLevel: money,
  isActive: z.boolean().optional(),
})

export const levelCreateSchema = z.object({
  courseId: requiredString('Course', 50),
  levelNumber: z.coerce.number().int().min(1).max(50),
  name: requiredString('Level name', 100),
  description: optionalString(2000),
  duration: optionalString(100),
  fee: money,
})
export type LevelCreateInput = z.infer<typeof levelCreateSchema>

export const levelUpdateSchema = levelCreateSchema.omit({ courseId: true })
