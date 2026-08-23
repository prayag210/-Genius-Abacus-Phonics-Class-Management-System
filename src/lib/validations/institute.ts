import { z } from 'zod'
import { optionalString, requiredString, isoDate, optionalIsoDate, money, positiveMoney, TIME_REGEX, CALENDAR_EVENT_TYPES } from './shared'

export const eventCreateSchema = z.object({
  title: requiredString('Title', 150),
  description: optionalString(2000),
  type: z.enum(CALENDAR_EVENT_TYPES),
  date: isoDate,
  endDate: optionalIsoDate,
  startTime: optionalString(10).refine(
    (v) => !v || TIME_REGEX.test(v),
    'Invalid time'
  ),
  endTime: optionalString(10).refine(
    (v) => !v || TIME_REGEX.test(v),
    'Invalid time'
  ),
  batchId: optionalString(50),
})

export const holidayCreateSchema = z.object({
  name: requiredString('Holiday name', 120),
  date: isoDate,
  description: optionalString(500),
})

export const certificateCreateSchema = z.object({
  studentId: requiredString('Student', 50),
  enrollmentId: optionalString(50),
  levelId: optionalString(50),
  type: requiredString('Certificate type', 60),
  title: requiredString('Title', 150),
  issueDate: isoDate,
  notes: optionalString(1000),
})

export const expenseCreateSchema = z.object({
  title: requiredString('Title', 150),
  category: requiredString('Category', 60),
  amount: positiveMoney,
  date: isoDate,
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']),
  notes: optionalString(500),
})

export const notificationCreateSchema = z.object({
  title: requiredString('Title', 150),
  message: requiredString('Message', 2000),
  type: z.enum(['INFO', 'WARNING', 'SUCCESS']).default('INFO'),
  role: z.enum(['ADMIN', 'TEACHER']).nullable().optional(),
})

export const settingsUpdateSchema = z.object({
  instituteName: requiredString('Institute name', 150),
  logo: optionalString(500),
  phone: optionalString(20),
  email: optionalString(120).refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Invalid email address'
  ),
  address: optionalString(500),
  whatsapp: optionalString(20),
  website: optionalString(200),
  defaultFee: money,
  passingPercentage: z.coerce.number().min(0).max(100),
  skills: z.array(z.string().trim().min(1).max(100)).max(100),
  paymentMethods: z.array(z.string().trim().min(1).max(50)).max(20),
})
