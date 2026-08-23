import { requireUser } from '@/lib/auth'
import { listEvents, listHolidays } from '@/server/services/institute'
import { listBatches } from '@/server/services/batches'
import { CalendarClient } from './calendar-client'

export const metadata = { title: 'Calendar' }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const now = new Date()
  const monthMatch = sp.month?.match(/^(\d{4})-(\d{2})$/)
  const year = monthMatch ? parseInt(monthMatch[1]) : now.getUTCFullYear()
  const month = monthMatch ? parseInt(monthMatch[2]) - 1 : now.getUTCMonth()

  const from = new Date(Date.UTC(year, month, 1))
  const to = new Date(Date.UTC(year, month + 1, 0)) // last day of month

  const [events, holidays, batches] = await Promise.all([
    listEvents({ from, to }),
    listHolidays(),
    listBatches({ includeInactive: false }),
  ])

  return (
    <CalendarClient
      isAdmin={user.role === 'ADMIN'}
      year={year}
      month={month}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        batchName: e.batch?.name ?? null,
        createdByName: e.createdBy?.fullName ?? null,
      }))}
      holidays={holidays
        .filter((h) => h.date >= from && h.date <= to)
        .map((h) => ({ id: h.id, name: h.name, date: h.date }))}
      batches={batches.map((b) => ({ id: b.id, name: b.name }))}
    />
  )
}
