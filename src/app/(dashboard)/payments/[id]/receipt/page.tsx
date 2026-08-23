import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getPayment } from '@/server/services/fees'
import { db } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReceiptActions } from './receipt-actions'

export const metadata = { title: 'Payment Receipt' }

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id } = await params

  const payment = await getPayment(id)
  if (!payment) notFound()

  // Teachers can only view receipts of their own students
  if (user.role === 'TEACHER' && user.teacher) {
    const hasAccess = await db.enrollment.findFirst({
      where: { studentId: payment.studentId, teacherId: user.teacher.id },
      select: { id: true },
    })
    if (!hasAccess) redirect('/dashboard')
  }

  const settings = await db.settings.findUnique({ where: { id: 'main' } })

  // Balance before/after this payment, computed from the fee record's history
  let previousBalance = Number(payment.amount)
  let feeTotal = 0
  if (payment.feeRecord) {
    feeTotal = Number(payment.feeRecord.totalFee)
    const earlierPayments = await db.payment.findMany({
      where: {
        feeRecordId: payment.feeRecordId,
        OR: [
          { paymentDate: { lt: payment.paymentDate } },
          { createdAt: { lte: payment.createdAt }, paymentDate: payment.paymentDate },
        ],
      },
      select: { amount: true },
    })
    const paidBefore = earlierPayments.reduce((s, p) => s + Number(p.amount), 0)
    previousBalance = feeTotal - paidBefore
  }
  const remainingBalance = previousBalance - Number(payment.amount)

  const institute = settings?.instituteName ?? 'Genius Abacus & Phonics Class'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link
          href="/payments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Payments
        </Link>
        <ReceiptActions />
      </div>

      {/* Receipt (printable area) */}
      <div className="print-area rounded-xl border border-border bg-card p-6 sm:p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col items-center border-b border-dashed border-border pb-6 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7 text-primary">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 8v8M12 8v8M17 8v8" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">{institute}</h1>
          {settings?.address && <p className="mt-0.5 text-xs text-muted-foreground">{settings.address}</p>}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {settings?.phone && <span>Phone: {settings.phone}</span>}
            {settings?.email && <span>Email: {settings.email}</span>}
            {settings?.website && <span>{settings.website}</span>}
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Payment Receipt
          </p>
        </div>

        {/* Receipt meta */}
        <div className="grid grid-cols-2 gap-4 border-b border-dashed border-border py-5 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Receipt Number</p>
            <p className="font-mono font-semibold">{payment.receiptNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(payment.paymentDate)}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 py-5 text-sm">
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Student</p>
              <p className="font-medium">{payment.student.fullName}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Course</p>
              <p className="font-medium">{payment.enrollment.course.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Level</p>
              <p className="font-medium">{payment.feeRecord?.level.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Payment Method</p>
              <p className="font-medium">{payment.method.replace('_', ' ')}</p>
            </div>
            {payment.transactionRef && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-muted-foreground">Transaction Reference</p>
                <p className="font-medium">{payment.transactionRef}</p>
              </div>
            )}
          </div>

          {/* Amount summary */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-muted-foreground">Previous Balance</span>
              <span className="font-medium tabular-nums">{formatCurrency(previousBalance)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border py-2 text-base font-semibold">
              <span>Amount Paid</span>
              <span className="tabular-nums text-emerald-700">{formatCurrency(Number(payment.amount))}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border py-1 text-sm">
              <span className="text-muted-foreground">Remaining Balance</span>
              <span className={`font-medium tabular-nums ${remainingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(remainingBalance)}
              </span>
            </div>
            {feeTotal > 0 && (
              <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                <span>Level fee total</span>
                <span className="tabular-nums">{formatCurrency(feeTotal)}</span>
              </div>
            )}
          </div>

          {payment.notes && (
            <div>
              <p className="text-xs uppercase text-muted-foreground">Notes</p>
              <p className="mt-0.5">{payment.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between border-t border-dashed border-border pt-6 text-xs text-muted-foreground">
          <div>
            <p>Recorded by: {payment.recordedBy?.username ?? '—'}</p>
            <p className="mt-0.5">This is a computer-generated receipt.</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-10 w-36 border-b border-border" />
            <p>Authorised Signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}
