import { requireUser } from '@/lib/auth'
import { listBatches, batchesForDay } from '@/server/services/batches'
import { getAttendanceForBatchDate } from '@/server/services/attendance'
import { getBatchStudents } from '@/server/services/batches'
import { todayISO } from '@/lib/utils'
import { AttendanceClient } from './attendance-client'

export const metadata = { title: 'Attendance' }

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; batchId?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO()
  const isTeacher = user.role === 'TEACHER' && !!user.teacher

  // batches running on this day
  const dayBatches = await batchesForDay(date, isTeacher ? user.teacher!.id : undefined)
  const allBatches = await listBatches({ includeInactive: false })
  const selectableBatches = isTeacher
    ? dayBatches
    : allBatches.filter((b) => dayBatches.some((d) => d.id === b.id))

  const selectedBatchId = sp.batchId && selectableBatches.some((b) => b.id === sp.batchId)
    ? sp.batchId
    : selectableBatches[0]?.id ?? null

  let students: { id: string; fullName: string; status: string }[] = []
  let existing = new Map<string, { status: string; remarks: string | null }>()

  if (selectedBatchId) {
    const [members, records] = await Promise.all([
      getBatchStudents(selectedBatchId),
      getAttendanceForBatchDate(selectedBatchId, new Date(`${date}T00:00:00.000Z`)),
    ])
    students = members.map((m) => ({ id: m.id, fullName: m.fullName, status: m.status }))
    existing = new Map(
      records.map((r) => [r.studentId, { status: r.status, remarks: r.remarks }])
    )
  }

  return (
    <AttendanceClient
      isAdmin={user.role === 'ADMIN'}
      date={date}
      batches={selectableBatches.map((b) => ({
        id: b.id,
        name: b.name,
        courseName: b.course.name,
        teacherName: b.teacher?.fullName ?? null,
        startTime: b.startTime,
        endTime: b.endTime,
      }))}
      selectedBatchId={selectedBatchId}
      students={students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        existing: existing.get(s.id) ?? null,
      }))}
    />
  )
}
