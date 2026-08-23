'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Search, Trash2, Wallet, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/lib/validations/shared'

type ExpenseRow = {
  id: string
  title: string
  category: string
  amount: number
  date: Date
  method: string
  notes: string | null
  recordedBy: string | null
}

export function ExpensesClient({
  expenses,
  summary,
  filters,
}: {
  expenses: ExpenseRow[]
  summary: { total: number; thisMonth: number; byCategory: { category: string; total: number }[] }
  filters: { from: string; to: string; category: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/expenses?${params.toString()}`))
  }

  const hasFilters = filters.from || filters.to || filters.category !== 'ALL'

  const filtered = search
    ? expenses.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    : expenses

  const columns: Column<ExpenseRow>[] = [
    {
      key: 'title',
      header: 'Expense',
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{e.title}</p>
          {e.notes && <p className="truncate text-xs text-muted-foreground">{e.notes}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{e.category}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (e) => <span className="text-sm font-semibold tabular-nums">{formatCurrency(e.amount)}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      className: 'hidden md:table-cell',
      render: (e) => <span className="text-sm">{formatDate(e.date)}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      className: 'hidden lg:table-cell',
      render: (e) => <DomainStatusBadge status={e.method} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (e) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-destructive hover:bg-destructive/10"
          onClick={async () => {
            const res = await fetch(`/api/expenses/${e.id}`, { method: 'DELETE' })
            if (!res.ok) toast.error(await fetchApiError(res))
            else {
              toast.success('Expense deleted.')
              router.refresh()
            }
          }}
          aria-label="Delete expense"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Record and categorise institute expenses."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Expenses" value={formatCurrency(summary.total)} icon={Wallet} iconClassName="bg-rose-500/10 text-rose-600" />
        <StatCard label="This Month" value={formatCurrency(summary.thisMonth)} />
        <StatCard label="Records" value={expenses.length} />
        <StatCard
          label="Top Category"
          value={summary.byCategory[0]?.category ?? '—'}
          hint={summary.byCategory[0] ? formatCurrency(summary.byCategory[0].total) : undefined}
        />
      </div>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:flex-wrap">
        <div className="relative flex-1 max-w-sm min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="pl-9 h-9"
          />
        </div>
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => updateFilter('from', e.target.value)}
          className="w-full lg:w-40 h-9"
          aria-label="From date"
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => updateFilter('to', e.target.value)}
          className="w-full lg:w-40 h-9"
          aria-label="To date"
        />
        <Select value={filters.category || 'ALL'} onValueChange={(v) => updateFilter('category', v)}>
          <SelectTrigger className="w-full lg:w-48 h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => router.push('/expenses')}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={pending}
        rowKey={(e) => e.id}
        emptyState={
          <EmptyState
            icon={Wallet}
            title={hasFilters ? 'No expenses match your filters' : 'No expenses recorded yet'}
            description="Track rent, salaries, materials and other institute costs."
            action={!hasFilters ? { label: 'Add Expense', onClick: () => setCreateOpen(true) } : undefined}
          />
        }
      />

      <CreateExpenseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function CreateExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Miscellaneous')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState('CASH')
  const [notes, setNotes] = useState('')

  async function submit() {
    if (!title.trim() || !amount || Number(amount) <= 0) {
      toast.error('Title and a positive amount are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          amount: Number(amount),
          date,
          method,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Expense recorded.')
      setTitle('')
      setAmount('')
      setNotes('')
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Expense"
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Classroom rent — August" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category *</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (₹) *</label>
            <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 15000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payment Method *</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </FormDialog>
  )
}
