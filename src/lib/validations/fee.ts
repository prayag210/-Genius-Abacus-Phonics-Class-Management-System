import { z } from 'zod'
import { optionalString, requiredString, isoDate, optionalIsoDate, positiveMoney, money } from './shared'

export const paymentCreateSchema = z.object({
  feeRecordId: requiredString('Fee record', 50),
  amount: positiveMoney,
  paymentDate: isoDate,
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']),
  transactionRef: optionalString(100),
  notes: optionalString(500),
})
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>

export const feeUpdateSchema = z.object({
  totalFee: money,
  dueDate: optionalIsoDate,
})

export const feeQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
  courseId: z.string().optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
})

export const paymentQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  method: z.string().trim().max(30).optional(),
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  from: optionalIsoDate,
  to: optionalIsoDate,
})
