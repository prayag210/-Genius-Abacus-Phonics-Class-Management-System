import { withAuth, ok, ApiError } from '@/lib/api'
import { getPayment } from '@/server/services/fees'

export const GET = withAuth<Record<string, string>>(
  async (_req, { params }) => {
    const payment = await getPayment(params.id)
    if (!payment) throw new ApiError(404, 'Payment not found.')
    return ok({ payment })
  },
  { action: 'payments:read' }
)

// Payments are immutable — no PUT/DELETE endpoints exist by design.
