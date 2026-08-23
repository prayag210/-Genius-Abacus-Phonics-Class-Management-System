/**
 * Dashboard service — aggregated statistics for admin and teacher dashboards.
 * All numbers are computed from live database data.
 */
import { db } from '@/lib/db'
import { startOfDay, subMonths } from 'date-fns'

/** Current month range (start, next-month start) in Asia/Kolkata calendar terms. */
async function istMonthRange(offset = 0): Promise<{ start: Date; end: Date }> {
  const now = new Date()
  const y = parseInt(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(now)
  )
  const m = parseInt(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', month: 'numeric' }).format(now)
  )
  const start = new Date(Date.UTC(y, m - 1 + offset, 1))
  const end = new Date(Date.UTC(y, m + offset, 1))
  return { start, end }
}

export type AdminDashboardData = {
  stats: {
    totalStudents: number
    activeStudents: number
    totalTeachers: number
    activeBatches: number
    courses: number
    levels: number
    pendingFeesAmount: number
    pendingFeesCount: number
    collectedThisMonth: number
    collectedAllTime: number
    expensesThisMonth: number
    totalExpenses: number
  }
  studentsByCourse: { name: string; students: number }[]
  studentsByTeacher: { name: string; students: number }[]
  feeCollectionByMonth: { month: string; collected: number; expenses: number }[]
  pendingFeesByCourse: { name: string; pending: number }[]
  levelDistribution: { name: string; students: number }[]
  recentPayments: {
    id: string
    receiptNumber: string
    amount: number
    paymentDate: Date
    method: string
    studentName: string
    courseName: string
  }[]
  upcomingEvents: {
    id: string
    title: string
    type: string
    date: Date
  }[]
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const now = new Date()
  const monthStart = await istMonthRange()
  const sixMonthsAgo = startOfDay(subMonths(now, 5))
  const dayStart = startOfDay(now)

  const [
    totalStudents,
    activeStudents,
    totalTeachers,
    activeBatches,
    courses,
    levels,
    feeRecords,
    paymentsThisMonth,
    paymentsAllTime,
    expensesThisMonthAgg,
    expensesAllAgg,
    enrollments,
    paymentsRecent,
    upcomingEvents,
  ] = await Promise.all([
    db.student.count(),
    db.student.count({ where: { status: 'ACTIVE' } }),
    db.teacher.count({ where: { isActive: true } }),
    db.batch.count({ where: { isActive: true } }),
    db.course.count({ where: { isActive: true } }),
    db.level.count({ where: { isActive: true } }),
    db.feeRecord.findMany({ select: { totalFee: true, paidAmount: true, status: true, enrollment: { select: { courseId: true, course: { select: { name: true } } } } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: monthStart.start } } }),
    db.payment.aggregate({ _sum: { amount: true } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart.start } } }),
    db.expense.aggregate({ _sum: { amount: true } }),
    db.enrollment.findMany({
      where: { status: 'ACTIVE' },
      select: {
        teacher: { select: { fullName: true } },
        course: { select: { name: true } },
        currentLevel: { select: { name: true, course: { select: { name: true } } } },
      },
    }),
    db.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paymentDate: true,
        method: true,
        student: { select: { fullName: true } },
        enrollment: { select: { course: { select: { name: true } } } },
      },
    }),
    db.calendarEvent.findMany({
      where: { date: { gte: dayStart } },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, title: true, type: true, date: true },
    }),
  ])

  // Pending fees
  const pendingFeesRecords = feeRecords.filter((f) => f.status !== 'PAID')
  const pendingFeesAmount = pendingFeesRecords.reduce(
    (sum, f) => sum + (Number(f.totalFee) - Number(f.paidAmount)),
    0
  )

  // Students by course (active enrollments)
  const courseMap = new Map<string, number>()
  for (const e of enrollments) {
    courseMap.set(e.course.name, (courseMap.get(e.course.name) ?? 0) + 1)
  }

  // Students by teacher (unique students per teacher)
  const teacherMap = new Map<string, number>()
  const teacherStudentPairs = await db.enrollment.findMany({
    where: { status: 'ACTIVE', teacherId: { not: null } },
    select: { teacherId: true, studentId: true, teacher: { select: { fullName: true } } },
  })
  const seen = new Set<string>()
  for (const p of teacherStudentPairs) {
    if (!p.teacherId) continue
    const key = `${p.teacherId}:${p.studentId}`
    if (seen.has(key)) continue
    seen.add(key)
    teacherMap.set(p.teacher?.fullName ?? 'Unassigned', (teacherMap.get(p.teacher?.fullName ?? 'Unassigned') ?? 0) + 1)
  }
  if (teacherMap.size === 0) teacherMap.set('No assignments yet', 0)

  // Fee collection by month (last 6 months)
  const monthlyAgg = await db.payment.groupBy({
    by: ['paymentDate'],
    where: { paymentDate: { gte: sixMonthsAgo } },
    _sum: { amount: true },
  })
  const monthlyExpenses = await db.expense.groupBy({
    by: ['date'],
    where: { date: { gte: sixMonthsAgo } },
    _sum: { amount: true },
  })

  const monthKeys: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    monthKeys.push({
      key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      label: d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }),
    })
  }
  const collectedByMonth = new Map<string, number>()
  for (const rec of monthlyAgg) {
    const d = rec.paymentDate
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    collectedByMonth.set(key, (collectedByMonth.get(key) ?? 0) + Number(rec._sum.amount ?? 0))
  }
  const expensesByMonth = new Map<string, number>()
  for (const rec of monthlyExpenses) {
    const d = rec.date
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + Number(rec._sum.amount ?? 0))
  }

  // Pending fees by course
  const pendingByCourse = new Map<string, number>()
  for (const f of pendingFeesRecords) {
    const name = f.enrollment.course.name
    pendingByCourse.set(name, (pendingByCourse.get(name) ?? 0) + (Number(f.totalFee) - Number(f.paidAmount)))
  }

  // Level distribution (current levels of active enrollments)
  const levelMap = new Map<string, number>()
  for (const e of enrollments) {
    const label = e.currentLevel ? `${e.course.name} · ${e.currentLevel.name}` : `${e.course.name} · Unassigned`
    levelMap.set(label, (levelMap.get(label) ?? 0) + 1)
  }

  return {
    stats: {
      totalStudents,
      activeStudents,
      totalTeachers,
      activeBatches,
      courses,
      levels,
      pendingFeesAmount,
      pendingFeesCount: pendingFeesRecords.length,
      collectedThisMonth: Number(paymentsThisMonth._sum.amount ?? 0),
      collectedAllTime: Number(paymentsAllTime._sum.amount ?? 0),
      expensesThisMonth: Number(expensesThisMonthAgg._sum.amount ?? 0),
      totalExpenses: Number(expensesAllAgg._sum.amount ?? 0),
    },
    studentsByCourse: Array.from(courseMap.entries()).map(([name, students]) => ({ name, students })),
    studentsByTeacher: Array.from(teacherMap.entries()).map(([name, students]) => ({ name, students })),
    feeCollectionByMonth: monthKeys.map(({ key, label }) => ({
      month: label,
      collected: collectedByMonth.get(key) ?? 0,
      expenses: expensesByMonth.get(key) ?? 0,
    })),
    pendingFeesByCourse: Array.from(pendingByCourse.entries()).map(([name, pending]) => ({ name, pending })),
    levelDistribution: Array.from(levelMap.entries())
      .map(([name, students]) => ({ name, students }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 10),
    recentPayments: paymentsRecent.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      method: p.method,
      studentName: p.student.fullName,
      courseName: p.enrollment.course.name,
    })),
    upcomingEvents: upcomingEvents.map((e) => ({ id: e.id, title: e.title, type: e.type, date: e.date })),
  }
}

export type TeacherDashboardData = {
  stats: {
    myStudents: number
    myCourses: number
    myBatches: number
    pendingFeesAmount: number
    pendingFeesCount: number
    attendanceRate: number
  }
  myBatchesToday: {
    id: string
    name: string
    days: string
    startTime: string
    endTime: string
    room: string | null
    courseName: string
    studentCount: number
  }[]
  recentProgress: {
    id: string
    studentName: string
    skillName: string
    rating: number
    date: Date
  }[]
  recentResults: {
    id: string
    studentName: string
    testName: string
    marks: number
    totalMarks: number
    passed: boolean
  }[]
}

export async function getTeacherDashboard(teacherId: string): Promise<TeacherDashboardData> {
  const today = new Date()
  const todayDow = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'numeric' })
      .format(today)
  )

  const [myEnrollments, myCourses, myBatches, feeRecords, attendanceAgg, recentRatings, recentResults] =
    await Promise.all([
      db.enrollment.findMany({
        where: { teacherId, status: 'ACTIVE' },
        select: { studentId: true },
      }),
      db.teacherCourse.count({ where: { teacherId } }),
      db.batch.findMany({
        where: { teacherId, isActive: true },
        include: {
          course: { select: { name: true } },
          _count: { select: { students: true } },
        },
      }),
      db.feeRecord.findMany({
        where: {
          status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
          enrollment: { teacherId },
        },
        select: { totalFee: true, paidAmount: true },
      }),
      db.attendance.groupBy({
        by: ['status'],
        where: {
          batch: { teacherId },
        },
        _count: { _all: true },
      }),
      db.skillRating.findMany({
        where: { student: { enrollments: { some: { teacherId } } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          skillName: true,
          rating: true,
          date: true,
          student: { select: { fullName: true } },
        },
      }),
      db.testResult.findMany({
        where: { student: { enrollments: { some: { teacherId } } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          marks: true,
          passed: true,
          test: { select: { name: true, totalMarks: true } },
          student: { select: { fullName: true } },
        },
      }),
    ])

  const uniqueStudents = new Set(myEnrollments.map((e) => e.studentId))

  const presentCount = attendanceAgg.find((a) => a.status === 'PRESENT')?._count._all ?? 0
  const lateCount = attendanceAgg.find((a) => a.status === 'LATE')?._count._all ?? 0
  const totalCount = attendanceAgg.reduce((sum, a) => sum + a._count._all, 0)
  const attendanceRate = totalCount === 0 ? 0 : Math.round(((presentCount + lateCount) / totalCount) * 100)

  const pendingFeesAmount = feeRecords.reduce(
    (sum, f) => sum + (Number(f.totalFee) - Number(f.paidAmount)),
    0
  )

  const myBatchesToday = myBatches
    .filter((b) => b.days.split(',').map((d) => d.trim()).includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][todayDow] ?? ''))
    .map((b) => ({
      id: b.id,
      name: b.name,
      days: b.days,
      startTime: b.startTime,
      endTime: b.endTime,
      room: b.room,
      courseName: b.course.name,
      studentCount: b._count.students,
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return {
    stats: {
      myStudents: uniqueStudents.size,
      myCourses,
      myBatches: myBatches.length,
      pendingFeesAmount,
      pendingFeesCount: feeRecords.length,
      attendanceRate,
    },
    myBatchesToday,
    recentProgress: recentRatings.map((r) => ({
      id: r.id,
      studentName: r.student.fullName,
      skillName: r.skillName,
      rating: r.rating,
      date: r.date,
    })),
    recentResults: recentResults.map((r) => ({
      id: r.id,
      studentName: r.student.fullName,
      testName: r.test.name,
      marks: Number(r.marks),
      totalMarks: r.test.totalMarks,
      passed: r.passed,
    })),
  }
}
