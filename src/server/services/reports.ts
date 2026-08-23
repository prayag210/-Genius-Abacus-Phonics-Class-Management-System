/**
 * Reports service — 8 report types with filters, all from live DB data.
 */
import { db } from '@/lib/db'
import { refreshOverdueStatuses } from './fees'

export type ReportFilter = {
  from?: Date | null
  to?: Date | null
  teacherId?: string | null
  courseId?: string | null
  levelId?: string | null
  batchId?: string | null
  status?: string | null
}

export type ReportRow = Record<string, string | number | null>
export type ReportResult = {
  title: string
  columns: { key: string; label: string; type?: 'money' | 'date' | 'percent' }[]
  rows: ReportRow[]
  summary?: { label: string; value: string }[]
}

export async function runReport(type: string, f: ReportFilter): Promise<ReportResult> {
  switch (type) {
    case 'students':
      return studentReport(f)
    case 'teachers':
      return teacherReport(f)
    case 'fees':
      return feeReport(f)
    case 'payments':
      return paymentReport(f)
    case 'attendance':
      return attendanceReport(f)
    case 'courses':
      return courseReport(f)
    case 'levels':
      return levelReport(f)
    case 'expenses':
      return expenseReport(f)
    default:
      throw new Error('Unknown report type')
  }
}

async function studentReport(f: ReportFilter): Promise<ReportResult> {
  await refreshOverdueStatuses()
  const students = await db.student.findMany({
    where: {
      ...(f.status && f.status !== 'ALL' ? { status: f.status as never } : {}),
      ...(f.courseId ? { enrollments: { some: { courseId: f.courseId } } } : {}),
      ...(f.teacherId ? { enrollments: { some: { teacherId: f.teacherId } } } : {}),
    },
    include: {
      parent: { select: { name: true } },
      enrollments: {
        include: {
          course: { select: { name: true } },
          currentLevel: { select: { name: true } },
          teacher: { select: { fullName: true } },
          feeRecords: { select: { totalFee: true, paidAmount: true, status: true } },
        },
      },
    },
    orderBy: { fullName: 'asc' },
  })

  const rows = students.map((s) => {
    const totalFee = s.enrollments.reduce(
      (sum, e) => sum + e.feeRecords.reduce((x, fr) => x + Number(fr.totalFee), 0),
      0
    )
    const totalPaid = s.enrollments.reduce(
      (sum, e) => sum + e.feeRecords.reduce((x, fr) => x + Number(fr.paidAmount), 0),
      0
    )
    return {
      name: s.fullName,
      phone: s.phone ?? '',
      parent: s.parent?.name ?? '',
      status: s.status,
      courses: s.enrollments.map((e) => e.course.name).join(', ') || '—',
      currentLevels: s.enrollments.map((e) => e.currentLevel?.name ?? '—').join(', ') || '—',
      teachers: Array.from(new Set(s.enrollments.map((e) => e.teacher?.fullName).filter(Boolean))).join(', ') || '—',
      totalFee,
      totalPaid,
      balance: totalFee - totalPaid,
    }
  })

  return {
    title: 'Student Report',
    columns: [
      { key: 'name', label: 'Student' },
      { key: 'phone', label: 'Phone' },
      { key: 'parent', label: 'Parent' },
      { key: 'status', label: 'Status' },
      { key: 'courses', label: 'Courses' },
      { key: 'currentLevels', label: 'Current Level(s)' },
      { key: 'teachers', label: 'Teacher(s)' },
      { key: 'totalFee', label: 'Total Fee', type: 'money' },
      { key: 'totalPaid', label: 'Paid', type: 'money' },
      { key: 'balance', label: 'Balance', type: 'money' },
    ],
    rows,
    summary: [
      { label: 'Total students', value: String(rows.length) },
      { label: 'Total billed', value: `₹${rows.reduce((s, r) => s + Number(r.totalFee), 0).toLocaleString('en-IN')}` },
      { label: 'Total collected', value: `₹${rows.reduce((s, r) => s + Number(r.totalPaid), 0).toLocaleString('en-IN')}` },
      { label: 'Outstanding', value: `₹${rows.reduce((s, r) => s + Number(r.balance), 0).toLocaleString('en-IN')}` },
    ],
  }
}

async function teacherReport(f: ReportFilter): Promise<ReportResult> {
  const teachers = await db.teacher.findMany({
    where: f.teacherId ? { id: f.teacherId } : {},
    include: {
      courses: { include: { course: { select: { name: true } } } },
      batches: { where: { isActive: true }, include: { course: { select: { name: true } } } },
      enrollments: { where: { status: 'ACTIVE' }, include: { student: { select: { id: true } } } },
    },
    orderBy: { fullName: 'asc' },
  })

  const rows = teachers.map((t) => ({
    name: t.fullName,
    branch: t.branch ?? '',
    phone: t.phone ?? '',
    status: t.isActive ? 'Active' : 'Inactive',
    courses: t.courses.map((c) => c.course.name).join(', ') || '—',
    batches: t.batches.length,
    activeStudents: new Set(t.enrollments.map((e) => e.student.id)).size,
  }))

  return {
    title: 'Teacher Report',
    columns: [
      { key: 'name', label: 'Teacher' },
      { key: 'branch', label: 'Branch' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' },
      { key: 'courses', label: 'Courses' },
      { key: 'batches', label: 'Active Batches' },
      { key: 'activeStudents', label: 'Active Students' },
    ],
    rows,
    summary: [
      { label: 'Total teachers', value: String(rows.length) },
      { label: 'Active', value: String(rows.filter((r) => r.status === 'Active').length) },
    ],
  }
}

async function feeReport(f: ReportFilter): Promise<ReportResult> {
  await refreshOverdueStatuses()
  const fees = await db.feeRecord.findMany({
    where: {
      ...(f.status && f.status !== 'ALL' ? { status: f.status as never } : {}),
      ...(f.courseId ? { enrollment: { courseId: f.courseId } } : {}),
      ...(f.teacherId ? { enrollment: { teacherId: f.teacherId } } : {}),
      ...(f.levelId ? { levelId: f.levelId } : {}),
    },
    include: {
      student: { select: { fullName: true } },
      level: { select: { name: true } },
      enrollment: { include: { course: { select: { name: true } }, teacher: { select: { fullName: true } } } },
    },
    orderBy: [{ student: { fullName: 'asc' } }],
  })

  const rows = fees.map((fr) => ({
    student: fr.student.fullName,
    course: fr.enrollment.course.name,
    level: fr.level.name,
    teacher: fr.enrollment.teacher?.fullName ?? '—',
    totalFee: Number(fr.totalFee),
    paid: Number(fr.paidAmount),
    balance: Number(fr.totalFee) - Number(fr.paidAmount),
    dueDate: fr.dueDate ? fr.dueDate.toISOString().slice(0, 10) : '',
    status: fr.status,
  }))

  return {
    title: 'Fee Report',
    columns: [
      { key: 'student', label: 'Student' },
      { key: 'course', label: 'Course' },
      { key: 'level', label: 'Level' },
      { key: 'teacher', label: 'Teacher' },
      { key: 'totalFee', label: 'Total Fee', type: 'money' },
      { key: 'paid', label: 'Paid', type: 'money' },
      { key: 'balance', label: 'Balance', type: 'money' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status' },
    ],
    rows,
    summary: [
      { label: 'Records', value: String(rows.length) },
      { label: 'Total billed', value: `₹${rows.reduce((s, r) => s + Number(r.totalFee), 0).toLocaleString('en-IN')}` },
      { label: 'Collected', value: `₹${rows.reduce((s, r) => s + Number(r.paid), 0).toLocaleString('en-IN')}` },
      { label: 'Pending', value: `₹${rows.reduce((s, r) => s + Number(r.balance), 0).toLocaleString('en-IN')}` },
    ],
  }
}

async function paymentReport(f: ReportFilter): Promise<ReportResult> {
  const payments = await db.payment.findMany({
    where: {
      ...(f.from || f.to
        ? {
            paymentDate: {
              ...(f.from ? { gte: f.from } : {}),
              ...(f.to ? { lte: f.to } : {}),
            },
          }
        : {}),
      ...(f.courseId ? { enrollment: { courseId: f.courseId } } : {}),
      ...(f.teacherId ? { enrollment: { teacherId: f.teacherId } } : {}),
      ...(f.status && f.status !== 'ALL' ? { method: f.status as never } : {}),
    },
    include: {
      student: { select: { fullName: true } },
      enrollment: { include: { course: { select: { name: true } } } },
      feeRecord: { include: { level: { select: { name: true } } } },
      recordedBy: { select: { username: true } },
    },
    orderBy: { paymentDate: 'desc' },
  })

  const rows = payments.map((p) => ({
    receipt: p.receiptNumber,
    date: p.paymentDate.toISOString().slice(0, 10),
    student: p.student.fullName,
    course: p.enrollment.course.name,
    level: p.feeRecord?.level.name ?? '—',
    amount: Number(p.amount),
    method: p.method,
    reference: p.transactionRef ?? '',
    recordedBy: p.recordedBy?.username ?? '',
  }))

  return {
    title: 'Payment Report',
    columns: [
      { key: 'receipt', label: 'Receipt #' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'student', label: 'Student' },
      { key: 'course', label: 'Course' },
      { key: 'level', label: 'Level' },
      { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' },
      { key: 'recordedBy', label: 'Recorded By' },
    ],
    rows,
    summary: [
      { label: 'Payments', value: String(rows.length) },
      { label: 'Total amount', value: `₹${rows.reduce((s, r) => s + Number(r.amount), 0).toLocaleString('en-IN')}` },
    ],
  }
}

async function attendanceReport(f: ReportFilter): Promise<ReportResult> {
  const attendance = await db.attendance.findMany({
    where: {
      ...(f.from || f.to
        ? {
            date: {
              ...(f.from ? { gte: f.from } : {}),
              ...(f.to ? { lte: f.to } : {}),
            },
          }
        : {}),
      ...(f.batchId ? { batchId: f.batchId } : {}),
      ...(f.courseId ? { batch: { courseId: f.courseId } } : {}),
      ...(f.teacherId ? { batch: { teacherId: f.teacherId } } : {}),
    },
    include: {
      student: { select: { fullName: true } },
      batch: { select: { name: true, course: { select: { name: true } } } },
    },
    orderBy: [{ date: 'desc' }, { student: { fullName: 'asc' } }],
    take: 1000,
  })

  const rows = attendance.map((a) => ({
    date: a.date.toISOString().slice(0, 10),
    student: a.student.fullName,
    batch: a.batch.name,
    course: a.batch.course.name,
    status: a.status,
    remarks: a.remarks ?? '',
  }))

  const present = rows.filter((r) => r.status === 'PRESENT').length
  const late = rows.filter((r) => r.status === 'LATE').length

  return {
    title: 'Attendance Report',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'student', label: 'Student' },
      { key: 'batch', label: 'Batch' },
      { key: 'course', label: 'Course' },
      { key: 'status', label: 'Status' },
      { key: 'remarks', label: 'Remarks' },
    ],
    rows,
    summary: [
      { label: 'Records', value: String(rows.length) },
      { label: 'Present', value: String(present) },
      { label: 'Late', value: String(late) },
      { label: 'Absent', value: String(rows.length - present - late) },
      {
        label: 'Attendance rate',
        value: rows.length ? `${Math.round(((present + late) / rows.length) * 100)}%` : '—',
      },
    ],
  }
}

async function courseReport(f: ReportFilter): Promise<ReportResult> {
  const courses = await db.course.findMany({
    where: f.courseId ? { id: f.courseId } : {},
    include: {
      levels: { orderBy: { levelNumber: 'asc' } },
      enrollments: { where: { status: 'ACTIVE' }, include: { student: { select: { id: true } } } },
      batches: { where: { isActive: true } },
    },
    orderBy: { name: 'asc' },
  })

  const rows = courses.map((c) => ({
    name: c.name,
    status: c.isActive ? 'Active' : 'Inactive',
    levels: c.levels.length,
    feePerLevel: Number(c.defaultFeePerLevel),
    totalFee: c.levels.reduce((s, l) => s + Number(l.fee), 0),
    activeStudents: new Set(c.enrollments.map((e) => e.student.id)).size,
    activeBatches: c.batches.length,
  }))

  return {
    title: 'Course Report',
    columns: [
      { key: 'name', label: 'Course' },
      { key: 'status', label: 'Status' },
      { key: 'levels', label: 'Levels' },
      { key: 'feePerLevel', label: 'Default Fee/Level', type: 'money' },
      { key: 'totalFee', label: 'Total (all levels)', type: 'money' },
      { key: 'activeStudents', label: 'Active Students' },
      { key: 'activeBatches', label: 'Active Batches' },
    ],
    rows,
  }
}

async function levelReport(f: ReportFilter): Promise<ReportResult> {
  const levels = await db.level.findMany({
    where: {
      ...(f.courseId ? { courseId: f.courseId } : {}),
      ...(f.levelId ? { id: f.levelId } : {}),
    },
    include: {
      course: { select: { name: true } },
      enrollments: { where: { status: 'ACTIVE' } },
      studentLevels: { where: { status: 'COMPLETED' } },
      feeRecords: { select: { totalFee: true, paidAmount: true } },
    },
    orderBy: [{ course: { name: 'asc' } }, { levelNumber: 'asc' }],
  })

  const rows = levels.map((l) => ({
    course: l.course.name,
    level: `#${l.levelNumber} ${l.name}`,
    fee: Number(l.fee),
    duration: l.duration ?? '',
    status: l.isActive ? 'Active' : 'Inactive',
    inProgress: l.enrollments.length,
    completed: l.studentLevels.length,
    billed: l.feeRecords.reduce((s, fr) => s + Number(fr.totalFee), 0),
    collected: l.feeRecords.reduce((s, fr) => s + Number(fr.paidAmount), 0),
  }))

  return {
    title: 'Level Report',
    columns: [
      { key: 'course', label: 'Course' },
      { key: 'level', label: 'Level' },
      { key: 'fee', label: 'Fee', type: 'money' },
      { key: 'duration', label: 'Duration' },
      { key: 'status', label: 'Status' },
      { key: 'inProgress', label: 'In Progress' },
      { key: 'completed', label: 'Completed' },
      { key: 'billed', label: 'Billed', type: 'money' },
      { key: 'collected', label: 'Collected', type: 'money' },
    ],
    rows,
  }
}

async function expenseReport(f: ReportFilter): Promise<ReportResult> {
  const expenses = await db.expense.findMany({
    where: {
      ...(f.from || f.to
        ? {
            date: {
              ...(f.from ? { gte: f.from } : {}),
              ...(f.to ? { lte: f.to } : {}),
            },
          }
        : {}),
    },
    include: { createdBy: { select: { username: true } } },
    orderBy: { date: 'desc' },
  })

  const rows = expenses.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    title: e.title,
    category: e.category,
    amount: Number(e.amount),
    method: e.method,
    notes: e.notes ?? '',
    recordedBy: e.createdBy?.username ?? '',
  }))

  return {
    title: 'Expense Report',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'method', label: 'Method' },
      { key: 'notes', label: 'Notes' },
      { key: 'recordedBy', label: 'Recorded By' },
    ],
    rows,
    summary: [
      { label: 'Expenses', value: String(rows.length) },
      { label: 'Total', value: `₹${rows.reduce((s, r) => s + Number(r.amount), 0).toLocaleString('en-IN')}` },
    ],
  }
}
