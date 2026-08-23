import { NextRequest } from 'next/server'
import { withAuth, parseBody, parseQuery, ok, handleDbError, ApiError } from '@/lib/api'
import { paymentCreateSchema, paymentQuerySchema } from '@/lib/validations/fee'
import { recordPayment, listPayments, getFeeRecord } from '@/server/services/fees'
import { logActivity } from '@/server/services/activity'
import { db } from '@/lib/db'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const query = parseQuery(req, paymentQuerySchema)
    const payments = await listPayments(query)

    // Teachers only see payments of their own students
    if (user.role === 'TEACHER' && user.teacher) {
      const myEnrollments = await db.enrollment.findMany({
        where: { teacherId: user.teacher.id },
        select: { studentId: true },
      })
      const myStudentIds = new Set(myEnrollments.map((e) => e.studentId))
      return ok({ payments: payments.filter((p) => myStudentIds.has(p.studentId)) })
    }

    return ok({ payments })
  },
  { action: 'payments:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, paymentCreateSchema)

    // Teachers may only record payments against their own students' fee records
    if (user.role === 'TEACHER' && user.teacher) {
      const fee = await getFeeRecord(input.feeRecordId)
      if (!fee || fee.enrollment.teacherId !== user.teacher.id) {
        throw new ApiError(403, 'You can only record payments for your own students.')
      }
    }

    try {
      const result = await recordPayment(input, user.id)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'PAYMENT',
        entity: 'Payment',
        entityId: result.payment.id,
        details: `${result.receiptNumber} — ₹${input.amount.toLocaleString('en-IN')} by ${result.studentName}`,
      })
      return ok(result, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'payments:manage' }
)
