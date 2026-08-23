import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Layers,
  LibraryBig,
  TrendingUp,
  UserCog,
  Wallet,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getAdminDashboard, getTeacherDashboard } from '@/server/services/dashboard'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { DomainStatusBadge, StatusBadge } from '@/components/shared/status-badge'
import { SimpleBarChart } from '@/components/dashboard/simple-bar-chart'
import { CollectionTrendChart } from '@/components/dashboard/collection-trend-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, formatTime12h } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

function greeting(): string {
  const h = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date())
  )
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const user = await requireUser()

  if (user.role === 'TEACHER' && user.teacher) {
    return <TeacherDashboard teacherId={user.teacher.id} name={user.teacher.fullName} />
  }

  const data = await getAdminDashboard()
  const s = data.stats

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user.teacher?.fullName ?? user.username}`}
        description="Here is what is happening at your institute today."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Students" value={s.totalStudents} hint={`${s.activeStudents} active`} icon={GraduationCap} />
        <StatCard label="Teachers" value={s.totalTeachers} hint="Active" icon={UserCog} />
        <StatCard label="Active Batches" value={s.activeBatches} hint="Running" icon={LibraryBig} />
        <StatCard label="Courses / Levels" value={`${s.courses} / ${s.levels}`} hint="Active programs" icon={BookOpen} />
        <StatCard
          label="Pending Fees"
          value={formatCurrency(s.pendingFeesAmount)}
          hint={`${s.pendingFeesCount} record(s) awaiting payment`}
          icon={AlertCircle}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          label="Collected This Month"
          value={formatCurrency(s.collectedThisMonth)}
          hint={`All time: ${formatCurrency(s.collectedAllTime)}`}
          icon={IndianRupee}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Expenses This Month"
          value={formatCurrency(s.expensesThisMonth)}
          hint={`All time: ${formatCurrency(s.totalExpenses)}`}
          icon={Wallet}
          iconClassName="bg-rose-500/10 text-rose-600"
        />
        <StatCard
          label="Net This Month"
          value={formatCurrency(s.collectedThisMonth - s.expensesThisMonth)}
          hint="Collected − expenses"
          icon={TrendingUp}
          iconClassName="bg-sky-500/10 text-sky-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleBarChart
          title="Students by Course"
          description="Active enrollments per course"
          data={data.studentsByCourse}
          dataKey="students"
        />
        <SimpleBarChart
          title="Students by Teacher"
          description="Unique active students per teacher"
          data={data.studentsByTeacher}
          dataKey="students"
          color="var(--chart-2)"
        />
        <CollectionTrendChart
          title="Fee Collection vs Expenses"
          description="Last 6 months"
          data={data.feeCollectionByMonth}
        />
        <SimpleBarChart
          title="Pending Fees by Course"
          description="Outstanding amounts per course"
          data={data.pendingFeesByCourse}
          dataKey="pending"
          format="currency"
          color="var(--chart-5)"
          emptyMessage="No pending fees — everything is paid up!"
        />
      </div>

      <SimpleBarChart
        title="Student Level Distribution"
        description="Current level of active enrollments"
        data={data.levelDistribution}
        dataKey="students"
        color="var(--chart-4)"
      />

      {/* Recent payments + upcoming events */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <Link href="/payments" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <EmptyState icon={IndianRupee} title="No payments recorded yet" description="Payments will appear here once you start recording them." className="border-0 bg-transparent py-6" />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.courseName} · {formatDate(p.paymentDate)} · {p.method.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(p.amount)}</p>
                      <p className="text-[11px] text-muted-foreground">{p.receiptNumber}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <Link href="/calendar" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No upcoming events" description="Schedule classes, tests and events from the calendar." className="border-0 bg-transparent py-6" />
            ) : (
              <ul className="divide-y divide-border">
                {data.upcomingEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                    </div>
                    <DomainStatusBadge status={e.type} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function TeacherDashboard({ teacherId, name }: { teacherId: string; name: string }) {
  const data = await getTeacherDashboard(teacherId)
  const s = data.stats

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}, ${name}`} description="Your classes and students at a glance." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="My Students" value={s.myStudents} hint="Active" icon={GraduationCap} />
        <StatCard label="My Courses" value={s.myCourses} hint="Assigned" icon={BookOpen} />
        <StatCard label="My Batches" value={s.myBatches} hint="Active" icon={LibraryBig} />
        <StatCard
          label="Attendance Rate"
          value={`${s.attendanceRate}%`}
          hint="Present + late / total"
          icon={ClipboardCheck}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Pending Student Fees"
          value={formatCurrency(s.pendingFeesAmount)}
          hint={`${s.pendingFeesCount} record(s)`}
          icon={AlertCircle}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.myBatchesToday.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No classes today"
                description="Your scheduled batches for today will appear here."
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.myBatchesToday.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.courseName} · {b.studentCount} student(s){b.room ? ` · Room ${b.room}` : ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Skill Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentProgress.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No ratings yet" description="Record skill ratings from the Progress page." className="border-0 bg-transparent py-6" />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentProgress.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.skillName} · {formatDate(r.date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{r.rating}/5</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentResults.length === 0 ? (
            <EmptyState icon={Layers} title="No test results yet" description="Results you enter will appear here." className="border-0 bg-transparent py-6" />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentResults.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground">{r.testName}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{r.marks}/{r.totalMarks}</p>
                    <StatusBadge label={r.passed ? 'Passed' : 'Failed'} variant={r.passed ? 'success' : 'destructive'} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
