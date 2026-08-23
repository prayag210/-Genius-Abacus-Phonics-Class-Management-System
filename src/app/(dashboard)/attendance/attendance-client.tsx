'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarCheck, CheckCircle2, Clock, Save, Users, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { fetchApiError } from '@/components/shared/form-dialog'
import { cn, formatTime12h } from '@/lib/utils'
import { todayISO } from '@/lib/utils'

type StudentRow = {
  id: string
  fullName: string
  existing: { status: string; remarks: string | null } | null
}

type BatchOption = {
  id: string
  name: string
  courseName: string
  teacherName: string | null
  startTime: string
  endTime: string
}

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'ABSENT', label: 'Absent', icon: XCircle, activeClass: 'bg-rose-600 text-white border-rose-600' },
  { value: 'LATE', label: 'Late', icon: Clock, activeClass: 'bg-amber-500 text-white border-amber-500' },
] as const

export function AttendanceClient({
  isAdmin,
  date,
  batches,
  selectedBatchId,
  students,
}: {
  isAdmin: boolean
  date: string
  batches: BatchOption[]
  selectedBatchId: string | null
  students: StudentRow[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<Record<string, { status: string; remarks: string }>>(() => {
    const initial: Record<string, { status: string; remarks: string }> = {}
    for (const s of students) {
      if (s.existing) {
        initial[s.id] = { status: s.existing.status, remarks: s.existing.remarks ?? '' }
      }
    }
    return initial
  })

  function setAll(status: string) {
    const next: Record<string, { status: string; remarks: string }> = {}
    for (const s of students) {
      next[s.id] = { status, remarks: records[s.id]?.remarks ?? '' }
    }
    setRecords(next)
  }

  const markedCount = students.filter((s) => records[s.id]).length
  const presentCount = students.filter((s) => records[s.id]?.status === 'PRESENT').length

  async function save() {
    if (!selectedBatchId) return
    const entries = Object.entries(records)
    if (entries.length === 0) {
      toast.error('Mark attendance for at least one student first.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatchId,
          date,
          records: entries.map(([studentId, r]) => ({
            studentId,
            status: r.status,
            remarks: r.remarks || null,
          })),
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(`Attendance saved for ${entries.length} student(s).`)
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Select a date and batch, then mark each student."
      />

      {/* Controls */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="att-date">
                Date
              </label>
              <Input
                id="att-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => {
                  if (e.target.value) router.push(`/attendance?date=${e.target.value}`)
                }}
                className="w-44"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium uppercase text-muted-foreground">Batches running on this day</label>
              <div className="flex flex-wrap gap-2">
                {batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No batches scheduled on this date.</p>
                ) : (
                  batches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => router.push(`/attendance?date=${date}&batchId=${b.id}`)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        selectedBatchId === b.id
                          ? 'border-primary bg-primary/10 font-medium'
                          : 'border-border bg-card hover:bg-secondary'
                      )}
                    >
                      <span className="block">{b.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatTime12h(b.startTime)}–{formatTime12h(b.endTime)}
                        {b.teacherName ? ` · ${b.teacherName}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedBatchId ? (
        <EmptyState
          icon={CalendarCheck}
          title="Select a batch"
          description="Choose a batch running on the selected date to mark attendance."
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students in this batch"
          description="Add students to the batch first from the Batches page."
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                {batches.find((b) => b.id === selectedBatchId)?.name ?? 'Batch'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {markedCount} of {students.length} marked · {presentCount} present
                {markedCount > 0 && ` · ${Math.round((presentCount / Math.max(markedCount, 1)) * 100)}% present`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAll('PRESENT')}>
                All Present
              </Button>
              <Button onClick={save} disabled={saving || markedCount === 0}>
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Attendance'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {students.map((s) => {
                const record = records[s.id]
                return (
                  <li key={s.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.fullName}</p>
                      {s.existing && (
                        <p className="text-xs text-muted-foreground">
                          Previously marked: {s.existing.status.toLowerCase()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {STATUS_OPTIONS.map((opt) => {
                        const Icon = opt.icon
                        const active = record?.status === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setRecords((prev) => ({
                                ...prev,
                                [s.id]: { status: opt.value, remarks: prev[s.id]?.remarks ?? '' },
                              }))
                            }
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors min-h-9',
                              active
                                ? opt.activeClass
                                : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                            )}
                            aria-pressed={active}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {opt.label}
                          </button>
                        )
                      })}
                      <Input
                        placeholder="Remarks"
                        value={record?.remarks ?? ''}
                        onChange={(e) =>
                          setRecords((prev) => ({
                            ...prev,
                            [s.id]: {
                              status: prev[s.id]?.status ?? 'PRESENT',
                              remarks: e.target.value,
                            },
                          }))
                        }
                        className="w-32 h-9 text-xs"
                        aria-label={`Remarks for ${s.fullName}`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
