import { requireUser } from '@/lib/auth'
import { listPayments } from '@/server/services/fees'
import { db } from '@/lib/db'
import { PaymentsClient } from './payments-client'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; method?: string; from?: string; to?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  let payments = await listPayments({
    q: sp.q?.trim() || undefined,
    method: sp.method || undefined,
    from: sp.from ? new Date(`${sp.from}T00:00:00.000Z`) : null,
    to: sp.to ? new Date(`${sp.to}T00:00:00.000Z`) : null,
  })

  // Teachers only see payments of their own students
  if (user.role === 'TEACHER' && user.teacher) {
    const myEnrollments = await db.enrollment.findMany({
      where: { teacherId: user.teacher.id },
      select: { studentId: true },
    })
    const myStudentIds = new Set(myEnrollments.map((e) => e.studentId))
    payments = payments.filter((p) => myStudentIds.has(p.studentId))
  }

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <PaymentsClient
      payments={payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        studentId: p.student.id,
        studentName: p.student.fullName,
        courseName: p.enrollment.course.name,
        levelName: p.feeRecord?.level.name ?? '—',
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        method: p.method,
        transactionRef: p.transactionRef,
        recordedBy: p.recordedBy?.username ?? null,
      }))}
      totalAmount={totalAmount}
      filters={{ q: sp.q ?? '', method: sp.method ?? 'ALL', from: sp.from ?? '', to: sp.to ?? '' }}
    />
  )
}
