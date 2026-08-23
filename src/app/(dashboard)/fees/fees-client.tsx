'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AlertCircle, IndianRupee, Search, Wallet, X, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { DataTable, type Column } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { PaymentDialog, type PayableFeeRecord } from '@/components/shared/payment-dialog'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { formatCurrency, formatDate, toDateInput } from '@/lib/utils'

type FeeRow = {
  id: string
  studentId: string
  studentName: string
  courseId: string
  courseName: string
  levelId: string
  levelName: string
  totalFee: number
  paidAmount: number
  dueDate: Date | null
  status: string
  paymentCount: number
}

export function FeesClient({
  isAdmin,
  fees,
  summary,
  courses,
  filters,
}: {
  isAdmin: boolean
  fees: FeeRow[]
  summary: { totalBilled: number; totalCollected: number; pending: number; overdueCount: number; recordCount: number }
  courses: { id: string; name: string }[]
  filters: { q: string; status: string; courseId: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.q)
  const [payFee, setPayFee] = useState<PayableFeeRecord | null>(null)
  const [editFee, setEditFee] = useState<FeeRow | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/fees?${params.toString()}`))
  }

  const hasFilters = filters.q || filters.status !== 'ALL' || filters.courseId

  const columns: Column<FeeRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (f) => (
        <div className="min-w-0">
          <Link href={`/students/${f.studentId}`} className="text-sm font-medium hover:text-primary hover:underline">
            {f.studentName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {f.courseName} · {f.levelName}
          </p>
        </div>
      ),
    },
    {
      key: 'totalFee',
      header: 'Total Fee',
      render: (f) => <span className="text-sm tabular-nums">{formatCurrency(f.totalFee)}</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (f) => <span className="text-sm tabular-nums">{formatCurrency(f.paidAmount)}</span>,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      render: (f) => (
        <span className={`text-sm font-semibold tabular-nums ${f.totalFee - f.paidAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {formatCurrency(f.totalFee - f.paidAmount)}
        </span>
      ),
    },
    {
      key: 'due',
      header: 'Due Date',
      className: 'hidden md:table-cell',
      render: (f) => <span className="text-sm">{f.dueDate ? formatDate(f.dueDate) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (f) => <DomainStatusBadge status={f.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-36',
      render: (f) => (
        <div className="flex gap-1.5">
          {f.status !== 'PAID' && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                setPayFee({
                  id: f.id,
                  studentName: f.studentName,
                  courseName: f.courseName,
                  levelName: f.levelName,
                  totalFee: f.totalFee,
                  paidAmount: f.paidAmount,
                })
              }
            >
              <IndianRupee className="h-3 w-3" /> Pay
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditFee(f)} aria-label="Edit fee">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Level-by-level fee tracking. The fee for each record comes from the level's configured fee."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Billed" value={formatCurrency(summary.totalBilled)} hint={`${summary.recordCount} record(s)`} icon={Wallet} />
        <StatCard
          label="Collected"
          value={formatCurrency(summary.totalCollected)}
          icon={IndianRupee}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Pending"
          value={formatCurrency(summary.pending)}
          icon={AlertCircle}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          label="Overdue Records"
          value={summary.overdueCount}
          icon={AlertCircle}
          iconClassName="bg-rose-500/10 text-rose-600"
        />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateFilter('q', search.trim())
          }}
          className="relative flex-1 max-w-sm"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            className="pl-9 h-9"
          />
        </form>
        <Select value={filters.status || 'ALL'} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.courseId || 'ALL'} onValueChange={(v) => updateFilter('courseId', v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(''); router.push('/fees') }}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={fees}
        loading={pending}
        rowKey={(f) => f.id}
        emptyState={
          <EmptyState
            icon={IndianRupee}
            title={hasFilters ? 'No fee records match your filters' : 'No fee records yet'}
            description={
              hasFilters
                ? 'Try adjusting or clearing the filters above.'
                : 'Fee records are created automatically when a student enrolls or moves to a new level.'
            }
          />
        }
      />

      <PaymentDialog fee={payFee} open={!!payFee} onOpenChange={(o) => !o && setPayFee(null)} />

      <EditFeeDialog fee={editFee} onOpenChange={(o) => !o && setEditFee(null)} onSuccess={() => { setEditFee(null); router.refresh() }} />
    </div>
  )
}

function EditFeeDialog({
  fee,
  onOpenChange,
  onSuccess,
}: {
  fee: FeeRow | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [totalFee, setTotalFee] = useState(fee?.totalFee ?? 0)
  const [dueDate, setDueDate] = useState(toDateInput(fee?.dueDate))
  const [submitting, setSubmitting] = useState(false)

  // re-sync when a different fee is opened
  useEffect(() => {
    if (fee) {
      setTotalFee(fee.totalFee)
      setDueDate(toDateInput(fee.dueDate))
    }
  }, [fee])

  async function submit() {
    if (!fee) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/fees/${fee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalFee, dueDate: dueDate || null }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Fee record updated.')
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={!!fee}
      onOpenChange={onOpenChange}
      title={`Edit Fee — ${fee?.studentName ?? ''}`}
      description={`${fee?.courseName ?? ''} · ${fee?.levelName ?? ''}`}
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="fee-total">
            Total Fee (₹) *
          </label>
          <Input
            id="fee-total"
            type="number"
            min="0"
            value={totalFee}
            onChange={(e) => setTotalFee(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="fee-due">
            Due Date
          </label>
          <Input id="fee-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Records that pass their due date without full payment are automatically marked overdue.
          </p>
        </div>
      </div>
    </FormDialog>
  )
}
