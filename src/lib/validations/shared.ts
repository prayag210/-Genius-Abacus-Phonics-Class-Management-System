import { z } from 'zod'

/** Optional trimmed string helper */
export const optionalString = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v))

export const requiredString = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)

/** yyyy-mm-dd date string -> Date at midnight UTC */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
  .transform((v) => new Date(`${v}T00:00:00.000Z`))

export const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : null))

/** Positive money amount */
export const money = z.coerce
  .number()
  .min(0, 'Amount cannot be negative')
  .max(10000000, 'Amount is too large')

export const positiveMoney = z.coerce
  .number()
  .positive('Amount must be greater than zero')
  .max(10000000, 'Amount is too large')

/** cuid param validation */
export const idParam = z.object({
  id: z.string().min(1),
})

/** Pagination & search query params */
export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().trim().max(30).optional(),
})
export type ListQuery = z.infer<typeof listQuerySchema>

export const DAYS_OPTIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const GENDER_OPTIONS = ['Male', 'Female', 'Other']
export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'LEFT'] as const
export const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const
export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE'] as const
export const CALENDAR_EVENT_TYPES = ['CLASS', 'TEST', 'EVENT', 'HOLIDAY', 'MEETING'] as const
export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Utilities',
  'Teaching Materials',
  'Marketing',
  'Equipment',
  'Maintenance',
  'Miscellaneous',
] as const
