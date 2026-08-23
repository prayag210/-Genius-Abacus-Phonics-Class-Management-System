/**
 * Fees & payments service.
 *
 * - FeeRecord holds totalFee / paidAmount / status per (enrollment, level).
 * - Every payment is an immutable history row with a unique receipt number
 *   generated from a PostgreSQL sequence.
 * - FeeRecord.paidAmount and status are updated transactionally when a
 *   payment is recorded; older payments are never modified.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'
import type { PaymentCreateInput } from '@/lib/validations/fee'

const feeInclude = {
  student: { select: { id: true, fullName: true, status: true } },
  enrollment: {
    select: {
      id: true,
      courseId: true,
      course: { select: { id: true, name: true } },
      teacherId: true,
    },
  },
  level: { select: { id: true, name: true, levelNumber: true } },
  payments: {
    orderBy: { paymentDate: 'desc' },
    select: { id: true, amount: true, paymentDate: true, method: true, receiptNumber: true },
  },
} satisfies Prisma.FeeRecordInclude

export type FeeRecordWithRelations = Prisma.FeeRecordGetPayload<{ include: typeof feeInclude }>

function computeStatus(totalFee: number, paidAmount: number, dueDate: Date | null): 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE' {
  if (paidAmount >= totalFee) return 'PAID'
  const overdue = dueDate ? dueDate < new Date() : false
  if (paidAmount > 0) return overdue ? 'OVERDUE' : 'PARTIALLY_PAID'
  return overdue ? 'OVERDUE' : 'PENDING'
}

export async function listFeeRecords(params: {
  q?: string
  status?: string
  courseId?: string
  teacherId?: string
  studentId?: string
}): Promise<FeeRecordWithRelations[]> {
  const where: Prisma.FeeRecordWhereInput = {}
  if (params.q) {
    where.student = { fullName: { contains: params.q, mode: 'insensitive' } }
  }
  if (params.status && params.status !== 'ALL') {
    where.status = params.status as never
  }
  if (params.studentId) where.studentId = params.studentId
  if (params.courseId || params.teacherId) {
    where.enrollment = {
      ...(params.courseId ? { courseId: params.courseId } : {}),
      ...(params.teacherId ? { teacherId: params.teacherId } : {}),
    }
  }

  // Refresh overdue statuses lazily
  await refreshOverdueStatuses()

  return db.feeRecord.findMany({
    where,
    include: feeInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

/** Mark stale PENDING/PARTIALLY_PAID records as OVERDUE when past due date. */
export async function refreshOverdueStatuses(): Promise<void> {
  try {
    await db.$executeRaw`
      UPDATE "FeeRecord"
      SET "status" = 'OVERDUE'
      WHERE "status" IN ('PENDING', 'PARTIALLY_PAID')
        AND "dueDate" IS NOT NULL
        AND "dueDate" < CURRENT_DATE
        AND "paidAmount" < "totalFee"
    `
  } catch (err) {
    console.error('[fees] failed to refresh overdue statuses:', err)
  }
}

export async function getFeeRecord(id: string): Promise<FeeRecordWithRelations | null> {
  return db.feeRecord.findUnique({ where: { id }, include: feeInclude })
}

export async function updateFeeRecord(
  id: string,
  input: { totalFee: number; dueDate: Date | null }
) {
  const existing = await db.feeRecord.findUnique({ where: { id }, include: { payments: true } })
  if (!existing) throw new ApiError(404, 'Fee record not found.')

  const totalPaid = existing.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  if (input.totalFee < totalPaid) {
    throw new ApiError(
      422,
      `Total fee cannot be less than the amount already paid (₹${totalPaid.toLocaleString('en-IN')}).`
    )
  }
  return db.feeRecord.update({
    where: { id },
    data: {
      totalFee: input.totalFee,
      dueDate: input.dueDate,
      status: computeStatus(input.totalFee, totalPaid, input.dueDate),
    },
    include: feeInclude,
  })
}

async function nextReceiptNumber(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<{ val: bigint }[]>`SELECT nextval('receipt_number_seq') as val`
  const seq = Number(rows[0].val)
  return `RCP-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`
}

/** Record a payment against a fee record. Returns the payment with receipt number. */
export async function recordPayment(input: PaymentCreateInput, recordedById: string) {
  return db.$transaction(async (tx) => {
    const feeRecord = await tx.feeRecord.findUnique({
      where: { id: input.feeRecordId },
      include: { payments: true, student: { select: { fullName: true } }, level: { select: { name: true } } },
    })
    if (!feeRecord) throw new ApiError(404, 'Fee record not found.')

    const totalPaid = feeRecord.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const remaining = Number(feeRecord.totalFee) - totalPaid
    if (remaining <= 0) {
      throw new ApiError(422, 'This fee is already fully paid.')
    }
    if (input.amount > remaining) {
      throw new ApiError(
        422,
        `Payment exceeds the remaining balance (₹${remaining.toLocaleString('en-IN')}).`
      )
    }

    const receiptNumber = await nextReceiptNumber(tx)

    const payment = await tx.payment.create({
      data: {
        receiptNumber,
        studentId: feeRecord.studentId,
        enrollmentId: feeRecord.enrollmentId,
        feeRecordId: feeRecord.id,
        amount: input.amount,
        paymentDate: input.paymentDate,
        method: input.method,
        transactionRef: input.transactionRef,
        notes: input.notes,
        recordedById,
      },
    })

    const newPaid = totalPaid + input.amount
    await tx.feeRecord.update({
      where: { id: feeRecord.id },
      data: {
        paidAmount: newPaid,
        status: computeStatus(Number(feeRecord.totalFee), newPaid, feeRecord.dueDate),
      },
    })

    return {
      payment,
      receiptNumber,
      studentName: feeRecord.student.fullName,
      levelName: feeRecord.level.name,
      previousBalance: remaining,
      remainingBalance: remaining - input.amount,
      totalFee: Number(feeRecord.totalFee),
      totalPaid: newPaid,
    }
  })
}

// ---------- Payments ----------

const paymentInclude = {
  student: { select: { id: true, fullName: true } },
  enrollment: { select: { id: true, course: { select: { name: true } } } },
  feeRecord: { include: { level: { select: { name: true } } } },
  recordedBy: { select: { username: true } },
} satisfies Prisma.PaymentInclude

export type PaymentWithRelations = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>

export async function listPayments(params: {
  q?: string
  method?: string
  studentId?: string
  courseId?: string
  from?: Date | null
  to?: Date | null
}): Promise<PaymentWithRelations[]> {
  const where: Prisma.PaymentWhereInput = {}
  if (params.q) {
    where.OR = [
      { student: { fullName: { contains: params.q, mode: 'insensitive' } } },
      { receiptNumber: { contains: params.q, mode: 'insensitive' } },
      { transactionRef: { contains: params.q, mode: 'insensitive' } },
    ]
  }
  if (params.method && params.method !== 'ALL') {
    where.method = params.method as never
  }
  if (params.studentId) where.studentId = params.studentId
  if (params.courseId) where.enrollment = { courseId: params.courseId }
  if (params.from || params.to) {
    where.paymentDate = {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    }
  }
  return db.payment.findMany({
    where,
    include: paymentInclude,
    orderBy: { paymentDate: 'desc' },
  })
}

export async function getPayment(id: string): Promise<PaymentWithRelations | null> {
  return db.payment.findUnique({ where: { id }, include: paymentInclude })
}

/** Payments must never be modified or deleted (audit integrity). */
export async function deletePayment(id: string): Promise<never> {
  throw new ApiError(405, 'Payments cannot be deleted once recorded. Record a correction entry instead.')
}

/** Fee summary for dashboard/fees page. */
export async function feeSummary(params?: { teacherId?: string }) {
  await refreshOverdueStatuses()
  const where: Prisma.FeeRecordWhereInput = params?.teacherId
    ? { enrollment: { teacherId: params.teacherId } }
    : {}
  const records = await db.feeRecord.findMany({
    where,
    select: { totalFee: true, paidAmount: true, status: true },
  })
  const totalBilled = records.reduce((s, r) => s + Number(r.totalFee), 0)
  const totalCollected = records.reduce((s, r) => s + Number(r.paidAmount), 0)
  const pending = records
    .filter((r) => r.status !== 'PAID')
    .reduce((s, r) => s + (Number(r.totalFee) - Number(r.paidAmount)), 0)
  const overdueCount = records.filter((r) => r.status === 'OVERDUE').length
  return { totalBilled, totalCollected, pending, overdueCount, recordCount: records.length }
}
