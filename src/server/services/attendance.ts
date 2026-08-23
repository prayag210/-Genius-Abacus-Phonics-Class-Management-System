/**
 * Attendance service — mark and query attendance with statistics.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'

export async function getAttendanceForBatchDate(batchId: string, date: Date) {
  return db.attendance.findMany({
    where: { batchId, date },
    include: {
      student: { select: { id: true, fullName: true, status: true } },
    },
    orderBy: { student: { fullName: 'asc' } },
  })
}

/** Save (upsert) attendance for a batch+date in one transaction. */
export async function saveAttendance(input: {
  batchId: string
  date: Date
  records: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE'; remarks?: string | null }[]
  markedById?: string | null
}) {
  const batch = await db.batch.findUnique({ where: { id: input.batchId } })
  if (!batch) throw new ApiError(404, 'Batch not found.')

  // verify students are in this batch
  const members = await db.batchStudent.findMany({
    where: { batchId: input.batchId },
    select: { studentId: true },
  })
  const memberIds = new Set(members.map((m) => m.studentId))
  for (const r of input.records) {
    if (!memberIds.has(r.studentId)) {
      throw new ApiError(422, 'One or more students are not members of this batch.')
    }
  }

  await db.$transaction(
    input.records.map((r) =>
      db.attendance.upsert({
        where: {
          batchId_studentId_date: {
            batchId: input.batchId,
            studentId: r.studentId,
            date: input.date,
          },
        },
        create: {
          batchId: input.batchId,
          studentId: r.studentId,
          date: input.date,
          status: r.status,
          remarks: r.remarks ?? null,
          markedById: input.markedById ?? null,
        },
        update: {
          status: r.status,
          remarks: r.remarks ?? null,
          markedById: input.markedById ?? null,
        },
      })
    )
  )

  return { saved: input.records.length }
}

export async function getAttendanceStats(studentId?: string, batchId?: string) {
  const where: Prisma.AttendanceWhereInput = {
    ...(studentId ? { studentId } : {}),
    ...(batchId ? { batchId } : {}),
  }
  const grouped = await db.attendance.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  })
  const present = grouped.find((g) => g.status === 'PRESENT')?._count._all ?? 0
  const late = grouped.find((g) => g.status === 'LATE')?._count._all ?? 0
  const absent = grouped.find((g) => g.status === 'ABSENT')?._count._all ?? 0
  const total = present + late + absent
  return {
    present,
    late,
    absent,
    total,
    rate: total === 0 ? 0 : Math.round(((present + late) / total) * 100),
  }
}

export async function listStudentAttendance(studentId: string, limit = 100) {
  return db.attendance.findMany({
    where: { studentId },
    include: { batch: { select: { name: true } } },
    orderBy: [{ date: 'desc' }],
    take: limit,
  })
}

export async function listBatchAttendance(batchId: string, limit = 200) {
  return db.attendance.findMany({
    where: { batchId },
    include: { student: { select: { fullName: true } } },
    orderBy: [{ date: 'desc' }],
    take: limit,
  })
}

/** Attendance summary per student for a batch (for the batch detail view). */
export async function batchStudentAttendanceSummary(batchId: string) {
  const members = await db.batchStudent.findMany({
    where: { batchId },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { student: { fullName: 'asc' } },
  })

  const grouped = await db.attendance.groupBy({
    by: ['studentId', 'status'],
    where: { batchId },
    _count: { _all: true },
  })

  return members.map(({ student }) => {
    const rows = grouped.filter((g) => g.studentId === student.id)
    const present = rows.find((r) => r.status === 'PRESENT')?._count._all ?? 0
    const late = rows.find((r) => r.status === 'LATE')?._count._all ?? 0
    const absent = rows.find((r) => r.status === 'ABSENT')?._count._all ?? 0
    const total = present + late + absent
    return {
      studentId: student.id,
      studentName: student.fullName,
      present,
      late,
      absent,
      total,
      rate: total === 0 ? null : Math.round(((present + late) / total) * 100),
    }
  })
}
