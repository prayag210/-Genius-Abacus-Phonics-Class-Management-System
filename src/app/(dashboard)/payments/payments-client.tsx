'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, FileText, IndianRupee, Search, X } from 'lucide-react'

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
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

type PaymentRow = {
  id: string
  receiptNumber: string
  studentId: string
  studentName: string
  courseName: string
  levelName: string
  amount: number
  paymentDate: Date
  method: string
  transactionRef: string | null
  recordedBy: string | null
}

export function PaymentsClient({
  payments,
  totalAmount,
  filters,
}: {
  payments: PaymentRow[]
  totalAmount: number
  filters: { q: string; method: string; from: string; to: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.q)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/payments?${params.toString()}`))
  }

  const hasFilters = filters.q || filters.method !== 'ALL' || filters.from || filters.to

  const columns: Column<PaymentRow>[] = [
    {
      key: 'receipt',
      header: 'Receipt #',
      render: (p) => (
        <Link
          href={`/payments/${p.id}/receipt`}
          className="text-sm font-medium font-mono hover:text-primary hover:underline"
        >
          {p.receiptNumber}
        </Link>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (p) => (
        <div className="min-w-0">
          <Link href={`/students/${p.studentId}`} className="text-sm font-medium hover:text-primary hover:underline">
            {p.studentName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {p.courseName} · {p.levelName}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.amount)}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      className: 'hidden md:table-cell',
      render: (p) => <span className="text-sm">{formatDate(p.paymentDate)}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => <DomainStatusBadge status={p.method} />,
    },
    {
      key: 'ref',
      header: 'Reference',
      className: 'hidden lg:table-cell',
      render: (p) => <span className="text-xs">{p.transactionRef ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28',
      render: (p) => (
        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
          <Link href={`/payments/${p.id}/receipt`}>
            <FileText className="h-3 w-3" /> Receipt
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Immutable payment history. Every payment generates a numbered receipt."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Payments (filtered)" value={payments.length} icon={CreditCard} />
        <StatCard
          label="Total Amount"
          value={formatCurrency(totalAmount)}
          icon={IndianRupee}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Average Payment"
          value={formatCurrency(payments.length ? totalAmount / payments.length : 0)}
        />
      </div>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:flex-wrap">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateFilter('q', search.trim())
          }}
          className="relative flex-1 max-w-sm min-w-[200px]"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt #, student, reference…"
            className="pl-9 h-9"
          />
        </form>
        <Select value={filters.method || 'ALL'} onValueChange={(v) => updateFilter('method', v)}>
          <SelectTrigger className="w-full lg:w-40 h-9">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All methods</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="UPI">UPI</SelectItem>
            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filters.from}
          max={todayISO()}
          onChange={(e) => updateFilter('from', e.target.value)}
          className="w-full lg:w-40 h-9"
          aria-label="From date"
        />
        <Input
          type="date"
          value={filters.to}
          max={todayISO()}
          onChange={(e) => updateFilter('to', e.target.value)}
          className="w-full lg:w-40 h-9"
          aria-label="To date"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(''); router.push('/payments') }}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={payments}
        loading={pending}
        rowKey={(p) => p.id}
        emptyState={
          <EmptyState
            icon={IndianRupee}
            title={hasFilters ? 'No payments match your filters' : 'No payments recorded yet'}
            description={
              hasFilters
                ? 'Try adjusting or clearing the filters above.'
                : 'Record payments from the Fees page.'
            }
          />
        }
      />
    </div>
  )
}
