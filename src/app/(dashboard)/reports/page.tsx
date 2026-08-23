import { requireUser } from '@/lib/auth'
import { runReport, type ReportResult } from '@/server/services/reports'
import { listCourses } from '@/server/services/courses'
import { teacherOptions } from '@/server/services/teachers'
import { listBatches } from '@/server/services/batches'
import { ReportsClient } from './reports-client'

export const metadata = { title: 'Reports' }

const REPORT_TYPES = [
  { value: 'students', label: 'Student Report' },
  { value: 'teachers', label: 'Teacher Report' },
  { value: 'fees', label: 'Fee Report' },
  { value: 'payments', label: 'Payment Report' },
  { value: 'attendance', label: 'Attendance Report' },
  { value: 'courses', label: 'Course Report' },
  { value: 'levels', label: 'Level Report' },
  { value: 'expenses', label: 'Expense Report' },
] as const

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    from?: string
    to?: string
    teacherId?: string
    courseId?: string
    levelId?: string
    batchId?: string
    status?: string
  }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const availableTypes = REPORT_TYPES.filter(
    (t) => user.role === 'ADMIN' || t.value !== 'expenses'
  )
  const type = availableTypes.some((t) => t.value === sp.type) ? sp.type! : 'students'

  const [courses, teachers, batches] = await Promise.all([
    listCourses(false),
    teacherOptions(),
    listBatches({ includeInactive: false }),
  ])

  let report: ReportResult | null = null
  let error: string | null = null
  try {
    report = await runReport(type, {
      from: sp.from ? new Date(`${sp.from}T00:00:00.000Z`) : null,
      to: sp.to ? new Date(`${sp.to}T00:00:00.000Z`) : null,
      teacherId: sp.teacherId || null,
      courseId: sp.courseId || null,
      levelId: sp.levelId || null,
      batchId: sp.batchId || null,
      status: sp.status || null,
    })
  } catch {
    error = 'Failed to generate this report. Please adjust the filters and try again.'
  }

  const queryString = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => !!v) as [string, string][]
  ).toString()

  return (
    <ReportsClient
      reportTypes={availableTypes.map((t) => ({ ...t }))}
      selectedType={type}
      report={
        report
          ? {
              title: report.title,
              columns: report.columns,
              rows: report.rows,
              summary: report.summary ?? [],
            }
          : null
      }
      error={error}
      filters={{
        from: sp.from ?? '',
        to: sp.to ?? '',
        teacherId: sp.teacherId ?? '',
        courseId: sp.courseId ?? '',
        levelId: sp.levelId ?? '',
        batchId: sp.batchId ?? '',
        status: sp.status ?? 'ALL',
      }}
      courses={courses.map((c) => ({ id: c.id, name: c.name, levels: c.levels.map((l) => ({ id: l.id, name: l.name })) }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.fullName }))}
      batches={batches.map((b) => ({ id: b.id, name: b.name }))}
      queryString={queryString}
    />
  )
}
