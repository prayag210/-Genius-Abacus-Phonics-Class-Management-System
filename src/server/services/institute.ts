/**
 * Calendar, holidays, certificates, expenses, notifications and settings services.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'

// ---------- Calendar ----------

const eventInclude = {
  batch: { select: { id: true, name: true } },
  createdBy: { select: { fullName: true } },
} satisfies Prisma.CalendarEventInclude

export type CalendarEventWithRelations = Prisma.CalendarEventGetPayload<{ include: typeof eventInclude }>

export async function listEvents(params: { from?: Date; to?: Date }): Promise<CalendarEventWithRelations[]> {
  return db.calendarEvent.findMany({
    where: {
      ...(params.from || params.to
        ? {
            date: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    },
    include: eventInclude,
    orderBy: { date: 'asc' },
  })
}

export async function createEvent(input: {
  title: string
  description: string | null
  type: 'CLASS' | 'TEST' | 'EVENT' | 'HOLIDAY' | 'MEETING'
  date: Date
  endDate: Date | null
  startTime: string | null
  endTime: string | null
  batchId: string | null
  createdById: string | null
}) {
  if (input.batchId) {
    const batch = await db.batch.findUnique({ where: { id: input.batchId } })
    if (!batch) throw new ApiError(404, 'Batch not found.')
  }
  return db.calendarEvent.create({ data: input, include: eventInclude })
}

export async function deleteEvent(id: string) {
  await db.calendarEvent.delete({ where: { id } })
}

// ---------- Holidays ----------

export async function listHolidays() {
  return db.holiday.findMany({ orderBy: { date: 'asc' } })
}

export async function createHoliday(input: { name: string; date: Date; description: string | null }) {
  return db.holiday.create({ data: input })
}

export async function deleteHoliday(id: string) {
  await db.holiday.delete({ where: { id } })
}

// ---------- Certificates ----------

async function nextSerialNumber(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<{ val: bigint }[]>`SELECT nextval('certificate_serial_seq') as val`
  const seq = Number(rows[0].val)
  return `CRT-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`
}

const certificateInclude = {
  student: { select: { id: true, fullName: true } },
  level: { select: { name: true } },
  enrollment: { select: { id: true, course: { select: { name: true } } } },
  issuedBy: { select: { fullName: true } },
} satisfies Prisma.CertificateInclude

export type CertificateWithRelations = Prisma.CertificateGetPayload<{ include: typeof certificateInclude }>

export async function listCertificates(params?: { studentId?: string }) {
  return db.certificate.findMany({
    where: params?.studentId ? { studentId: params.studentId } : {},
    include: certificateInclude,
    orderBy: { issueDate: 'desc' },
  })
}

export async function createCertificate(input: {
  studentId: string
  enrollmentId: string | null
  levelId: string | null
  type: string
  title: string
  issueDate: Date
  notes: string | null
  issuedById: string | null
}) {
  const student = await db.student.findUnique({ where: { id: input.studentId } })
  if (!student) throw new ApiError(404, 'Student not found.')
  return db.$transaction(async (tx) => {
    const serialNumber = await nextSerialNumber(tx)
    return tx.certificate.create({
      data: { ...input, serialNumber },
      include: certificateInclude,
    })
  })
}

export async function deleteCertificate(id: string) {
  await db.certificate.delete({ where: { id } })
}

// ---------- Expenses ----------

const expenseInclude = {
  createdBy: { select: { username: true } },
} satisfies Prisma.ExpenseInclude

export type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>

export async function listExpenses(params?: { from?: Date | null; to?: Date | null; category?: string }) {
  return db.expense.findMany({
    where: {
      ...(params?.from || params?.to
        ? {
            date: {
              ...(params?.from ? { gte: params.from } : {}),
              ...(params?.to ? { lte: params.to } : {}),
            },
          }
        : {}),
      ...(params?.category && params.category !== 'ALL' ? { category: params.category } : {}),
    },
    include: expenseInclude,
    orderBy: { date: 'desc' },
  })
}

export async function createExpense(input: {
  title: string
  category: string
  amount: number
  date: Date
  method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'
  notes: string | null
  createdById: string
}) {
  return db.expense.create({ data: input, include: expenseInclude })
}

export async function deleteExpense(id: string) {
  await db.expense.delete({ where: { id } })
}

export async function expenseSummary() {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const [allAgg, monthAgg, byCategory] = await Promise.all([
    db.expense.aggregate({ _sum: { amount: true } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } }),
    db.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ])
  return {
    total: Number(allAgg._sum.amount ?? 0),
    thisMonth: Number(monthAgg._sum.amount ?? 0),
    byCategory: byCategory.map((c) => ({ category: c.category, total: Number(c._sum.amount ?? 0) })),
  }
}

// ---------- Notifications ----------

export async function listNotifications(userId: string, role: string) {
  return db.notification.findMany({
    where: {
      OR: [{ userId }, { role: role as never }, { userId: null, role: null }],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function createNotification(input: {
  title: string
  message: string
  type?: string
  role?: 'ADMIN' | 'TEACHER' | null
  createdById?: string | null
}) {
  return db.notification.create({ data: input })
}

export async function markNotificationRead(id: string, userId: string) {
  const notif = await db.notification.findUnique({ where: { id } })
  if (!notif) throw new ApiError(404, 'Notification not found.')
  // only the recipient can mark it read
  await db.notification.update({ where: { id }, data: { isRead: true } })
}

export async function markAllNotificationsRead(userId: string, role: string) {
  await db.notification.updateMany({
    where: {
      OR: [{ userId }, { role: role as never }],
      isRead: false,
    },
    data: { isRead: true },
  })
}

// ---------- Settings ----------

export async function getSettings() {
  const settings = await db.settings.findUnique({ where: { id: 'main' } })
  if (settings) return settings
  return db.settings.create({ data: { id: 'main' } })
}

export async function updateSettings(input: {
  instituteName?: string
  logo?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  whatsapp?: string | null
  website?: string | null
  defaultFee?: number
  passingPercentage?: number
  skills?: string[]
  paymentMethods?: string[]
}) {
  return db.settings.upsert({
    where: { id: 'main' },
    update: input,
    create: { id: 'main', ...input },
  })
}
