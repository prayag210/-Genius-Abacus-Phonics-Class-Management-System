import { NextRequest, NextResponse } from 'next/server'
import { withAuth, ok, ApiError } from '@/lib/api'
import { runReport } from '@/server/services/reports'

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const sp = req.nextUrl.searchParams
    const type = sp.get('type') ?? 'students'

    // Teachers have a limited set of reports (no expenses)
    if (user.role === 'TEACHER' && type === 'expenses') {
      throw new ApiError(403, 'You do not have permission to view expense reports.')
    }

    const f = {
      from: sp.get('from') ? new Date(`${sp.get('from')}T00:00:00.000Z`) : null,
      to: sp.get('to') ? new Date(`${sp.get('to')}T00:00:00.000Z`) : null,
      teacherId: sp.get('teacherId') || null,
      courseId: sp.get('courseId') || null,
      levelId: sp.get('levelId') || null,
      batchId: sp.get('batchId') || null,
      status: sp.get('status') || null,
    }

    const report = await runReport(type, f)

    // CSV export mode
    if (sp.get('format') === 'csv') {
      const header = report.columns.map((c) => `"${c.label}"`).join(',')
      const lines = report.rows.map((row) =>
        report.columns
          .map((c) => {
            const v = row[c.key] ?? ''
            return `"${String(v).replace(/"/g, '""')}"`
          })
          .join(',')
      )
      const csv = [header, ...lines].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      }) as unknown as NextResponse
    }

    return ok({ report })
  },
  { action: 'reports:read' }
)
