import { requireUser } from '@/lib/auth'
import { listFeeRecords, feeSummary } from '@/server/services/fees'
import { listCourses } from '@/server/services/courses'
import { FeesClient } from './fees-client'

export const metadata = { title: 'Fees' }

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; courseId?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const teacherId = user.role === 'TEACHER' && user.teacher ? user.teacher.id : undefined

  const [fees, summary, courses] = await Promise.all([
    listFeeRecords({
      q: sp.q?.trim() || undefined,
      status: sp.status || undefined,
      courseId: sp.courseId || undefined,
      teacherId,
    }),
    feeSummary(teacherId ? { teacherId } : undefined),
    listCourses(false),
  ])

  return (
    <FeesClient
      isAdmin={user.role === 'ADMIN'}
      fees={fees.map((f) => ({
        id: f.id,
        studentId: f.student.id,
        studentName: f.student.fullName,
        courseId: f.enrollment.course.id,
        courseName: f.enrollment.course.name,
        levelId: f.level.id,
        levelName: f.level.name,
        totalFee: Number(f.totalFee),
        paidAmount: Number(f.paidAmount),
        dueDate: f.dueDate,
        status: f.status,
        paymentCount: f.payments.length,
      }))}
      summary={{
        totalBilled: summary.totalBilled,
        totalCollected: summary.totalCollected,
        pending: summary.pending,
        overdueCount: summary.overdueCount,
        recordCount: summary.recordCount,
      }}
      courses={courses.map((c) => ({ id: c.id, name: c.name }))}
      filters={{ q: sp.q ?? '', status: sp.status ?? 'ALL', courseId: sp.courseId ?? '' }}
    />
  )
}
