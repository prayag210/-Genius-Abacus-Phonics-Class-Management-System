'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { cn, formatDate, todayISO } from '@/lib/utils'
import { DAY_LABELS, MONTHS } from '@/lib/utils'

type EventRow = {
  id: string
  title: string
  description: string | null
  type: string
  date: Date
  startTime: string | null
  endTime: string | null
  batchName: string | null
  createdByName: string | null
}

type HolidayRow = { id: string; name: string; date: Date }

const TYPE_COLORS: Record<string, string> = {
  CLASS: 'bg-sky-500',
  TEST: 'bg-rose-500',
  EVENT: 'bg-primary',
  HOLIDAY: 'bg-amber-500',
  MEETING: 'bg-violet-500',
}

export function CalendarClient({
  isAdmin,
  year,
  month,
  events,
  holidays,
  batches,
}: {
  isAdmin: boolean
  year: number
  month: number
  events: EventRow[]
  holidays: HolidayRow[]
  batches: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'EVENT' | 'HOLIDAY'>('EVENT')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const firstDay = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const startDow = firstDay.getUTCDay()

  const byDate = useMemo(() => {
    const map = new Map<string, { events: EventRow[]; holiday?: HolidayRow }>()
    for (const e of events) {
      const key = new Date(e.date).toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, { events: [] })
      map.get(key)!.events.push(e)
    }
    for (const h of holidays) {
      const key = new Date(h.date).toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, { events: [] })
      map.get(key)!.holiday = h
    }
    return map
  }, [events, holidays])

  const selectedKey = selectedDate
  const selectedDay = selectedKey ? byDate.get(selectedKey) : null

  function prevMonth() {
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    router.push(`/calendar?month=${y}-${String(m + 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    router.push(`/calendar?month=${y}-${String(m + 1).padStart(2, '0')}`)
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Classes, tests, events, holidays and meetings in one place."
        actions={
          isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateMode('HOLIDAY')
                  setCreateOpen(true)
                }}
              >
                Add Holiday
              </Button>
              <Button
                onClick={() => {
                  setCreateMode('EVENT')
                  setCreateOpen(true)
                }}
              >
                <Plus className="h-4 w-4" /> Add Event
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Month grid */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-1 text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayData = byDate.get(key)
              const isToday = key === todayISO()
              const hasEvents = dayData && (dayData.events.length > 0 || dayData.holiday)
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-start rounded-md border p-1 transition-colors min-h-14',
                    selectedKey === key
                      ? 'border-primary bg-primary/10'
                      : hasEvents
                        ? 'border-border bg-secondary/50 hover:bg-secondary'
                        : 'border-transparent hover:bg-muted',
                    isToday && 'ring-1 ring-primary'
                  )}
                  aria-label={`${formatDate(key)}${dayData?.events.length ? `, ${dayData.events.length} event(s)` : ''}`}
                >
                  <span className={cn('text-xs font-medium', isToday && 'text-primary')}>{day}</span>
                  <div className="mt-auto flex flex-wrap justify-center gap-0.5">
                    {dayData?.holiday && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                    {dayData?.events.slice(0, 3).map((e) => (
                      <span key={e.id} className={cn('h-1.5 w-1.5 rounded-full', TYPE_COLORS[e.type] ?? 'bg-primary')} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', color)} />
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold">
            {selectedKey ? formatDate(selectedKey) : 'Select a day'}
          </h2>
          {!selectedKey ? (
            <p className="text-sm text-muted-foreground">
              Click a date on the calendar to see its events and holidays.
            </p>
          ) : !selectedDay || (selectedDay.events.length === 0 && !selectedDay.holiday) ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled"
              description="No events or holidays on this date."
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <div className="space-y-3">
              {selectedDay.holiday && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{selectedDay.holiday.name}</p>
                    {isAdmin && (
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete holiday"
                        onClick={async () => {
                          const res = await fetch(`/api/calendar/holidays/${selectedDay.holiday!.id}`, {
                            method: 'DELETE',
                          })
                          if (!res.ok) toast.error(await fetchApiError(res))
                          else {
                            toast.success('Holiday deleted.')
                            router.refresh()
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <DomainStatusBadge status="HOLIDAY" />
                </div>
              )}
              {selectedDay.events.map((e) => (
                <div key={e.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{e.description}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[e.startTime && e.endTime ? `${e.startTime}–${e.endTime}` : null, e.batchName]
                          .filter(Boolean)
                          .join(' · ') || 'All day'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <DomainStatusBadge status={e.type} />
                      {isAdmin && (
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete event"
                          onClick={async () => {
                            const res = await fetch(`/api/calendar/events/${e.id}`, { method: 'DELETE' })
                            if (!res.ok) toast.error(await fetchApiError(res))
                            else {
                              toast.success('Event deleted.')
                              router.refresh()
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateDialog
        open={createOpen}
        mode={createMode}
        batches={batches}
        defaultDate={selectedKey ?? todayISO()}
        onOpenChange={(o) => {
          setCreateOpen(o)
          if (o) setCreateMode('EVENT')
        }}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function CreateDialog({
  open,
  mode,
  batches,
  defaultDate,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  mode: 'EVENT' | 'HOLIDAY'
  batches: { id: string; name: string }[]
  defaultDate: string
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('CLASS')
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [batchId, setBatchId] = useState('NONE')

  async function submit() {
    if (!title.trim() || !date) {
      toast.error('Title and date are required.')
      return
    }
    setSubmitting(true)
    try {
      const url = mode === 'EVENT' ? '/api/calendar/events' : '/api/calendar/holidays'
      const body =
        mode === 'EVENT'
          ? {
              title: title.trim(),
              description: description || null,
              type,
              date,
              startTime: startTime || null,
              endTime: endTime || null,
              batchId: batchId === 'NONE' ? null : batchId,
            }
          : { name: title.trim(), date, description: description || null }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(mode === 'EVENT' ? 'Event created.' : 'Holiday added.')
      setTitle('')
      setDescription('')
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'EVENT' ? 'Add Calendar Event' : 'Add Holiday'}
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{mode === 'EVENT' ? 'Event Title *' : 'Holiday Name *'}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === 'EVENT' ? 'e.g. Level 1 Assessment' : 'e.g. Diwali Vacation'} />
        </div>
        {mode === 'EVENT' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type *</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS">Class</SelectItem>
                  <SelectItem value="TEST">Test</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="HOLIDAY">Holiday</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Batch</label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">All batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {mode === 'EVENT' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
    </FormDialog>
  )
}
