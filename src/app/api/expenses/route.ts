import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { expenseCreateSchema } from '@/lib/validations/institute'
import { listExpenses, createExpense, expenseSummary } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest) => {
    const sp = req.nextUrl.searchParams
    const [expenses, summary] = await Promise.all([
      listExpenses({
        from: sp.get('from') ? new Date(`${sp.get('from')}T00:00:00.000Z`) : null,
        to: sp.get('to') ? new Date(`${sp.get('to')}T00:00:00.000Z`) : null,
        category: sp.get('category') ?? undefined,
      }),
      expenseSummary(),
    ])
    return ok({ expenses, summary })
  },
  { action: 'expenses:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, expenseCreateSchema)
    try {
      const expense = await createExpense({ ...input, createdById: user.id })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'CREATE',
        entity: 'Expense',
        entityId: expense.id,
        details: `${expense.title} — ₹${expense.amount}`,
      })
      return ok({ expense }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'expenses:manage' }
)
