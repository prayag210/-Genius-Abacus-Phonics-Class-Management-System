import { requireAdmin } from '@/lib/auth'
import { listExpenses, expenseSummary } from '@/server/services/institute'
import { ExpensesClient } from './expenses-client'

export const metadata = { title: 'Expenses' }

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams

  const [expenses, summary] = await Promise.all([
    listExpenses({
      from: sp.from ? new Date(`${sp.from}T00:00:00.000Z`) : null,
      to: sp.to ? new Date(`${sp.to}T00:00:00.000Z`) : null,
      category: sp.category || undefined,
    }),
    expenseSummary(),
  ])

  return (
    <ExpensesClient
      expenses={expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount),
        date: e.date,
        method: e.method,
        notes: e.notes,
        recordedBy: e.createdBy?.username ?? null,
      }))}
      summary={summary}
      filters={{ from: sp.from ?? '', to: sp.to ?? '', category: sp.category ?? 'ALL' }}
    />
  )
}
