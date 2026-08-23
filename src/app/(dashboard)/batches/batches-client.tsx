'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, LibraryBig, Plus, Trash2, UserPlus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { StatCard } from '@/components/shared/stat-card'
import { formatTime12h } from '@/lib/utils'
import { DAYS_OPTIONS } from '@/lib/validations/shared'
import type { batchCreateSchema } from '@/lib/validations/batch'
import type { z } from 'zod'

type BatchRow = {
  id: string
  name: string
  courseId: string
  courseName: string
  levelId: string | null
  levelName: string | null
  teacherId: string | null
  teacherName: string | null
  days: string
  startTime: string
  endTime: string
  room: string | null
  maxStudents: number
  isActive: boolean
  studentCount: number
  members: { id: string; fullName: string; status: string }[]
}

type BatchFormValues = {
  name: string
  courseId: string
  levelId: string | null
  teacherId: string | null
  days: string
  startTime: string
  endTime: string
  room: string | null
  maxStudents: number
}

export function BatchesClient({
  isAdmin,
  batches,
  courses,
  teachers,
  students,
  filters,
}: {
  isAdmin: boolean
  batches: BatchRow[]
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
  teachers: { id: string; name: string }[]
  students: { id: string; fullName: string }[]
  filters: { courseId: string; teacherId: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [editBatch, setEditBatch] = useState<BatchRow | null>(null)
  const [deleteBatch, setDeleteBatch] = useState<BatchRow | null>(null)
  const [studentsBatch, setStudentsBatch] = useState<BatchRow | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/batches?${params.toString()}`))
  }

  const activeBatches = batches.filter((b) => b.isActive).length
  const totalSeats = batches.reduce((s, b) => s + b.maxStudents, 0)
  const totalStudents = batches.reduce((s, b) => s + b.studentCount, 0)

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Class groups with weekly schedules. Students are added per batch."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Batch
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Batches" value={batches.length} hint={`${activeBatches} active`} icon={LibraryBig} />
        <StatCard label="Students Assigned" value={totalStudents} icon={Users} />
        <StatCard label="Total Capacity" value={totalSeats} icon={CalendarClock} />
        <StatCard label="Utilisation" value={totalSeats ? `${Math.round((totalStudents / totalSeats) * 100)}%` : '—'} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={filters.courseId || 'ALL'} onValueChange={(v) => updateFilter('courseId', v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-48 h-9">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filters.teacherId || 'ALL'} onValueChange={(v) => updateFilter('teacherId', v === 'ALL' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-48 h-9">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All teachers</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {batches.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title="No batches yet"
          description="Create a batch to schedule classes and manage attendance."
          action={isAdmin ? { label: 'Add Batch', onClick: () => setCreateOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {batches.map((b) => {
            const isOpen = expanded === b.id
            return (
              <Card key={b.id}>
                <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{b.name}</CardTitle>
                      <DomainStatusBadge status={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {b.courseName}
                      {b.levelName ? ` · ${b.levelName}` : ''} · {b.teacherName ?? 'No teacher'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {b.days} · {formatTime12h(b.startTime)}–{formatTime12h(b.endTime)}
                      {b.room ? ` · Room ${b.room}` : ''} · {b.studentCount}/{b.maxStudents} students
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/attendance?batchId=${b.id}`}>Attendance</Link>
                    </Button>
                    {isAdmin && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setStudentsBatch(b)}>
                          <UserPlus className="h-3.5 w-3.5" /> Students
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditBatch(b)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteBatch(b)}
                          aria-label="Delete batch"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(isOpen ? null : b.id)}>
                      {isOpen ? 'Hide members' : 'Members'}
                    </Button>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="border-t border-border pt-4">
                    {b.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students in this batch yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {b.members.map((m) => (
                          <Link
                            key={m.id}
                            href={`/students/${m.id}`}
                            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/50"
                          >
                            {m.fullName}
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <BatchFormDialog
        open={createOpen}
        courses={courses}
        teachers={teachers}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />

      <BatchFormDialog
        batch={editBatch}
        courses={courses}
        teachers={teachers}
        open={!!editBatch}
        onOpenChange={(o) => !o && setEditBatch(null)}
        onSuccess={() => {
          setEditBatch(null)
          router.refresh()
        }}
      />

      <ManageStudentsDialog
        batch={studentsBatch}
        students={students}
        onOpenChange={(o) => !o && setStudentsBatch(null)}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!deleteBatch}
        onOpenChange={(o) => !o && setDeleteBatch(null)}
        title={`Delete batch "${deleteBatch?.name ?? ''}"?`}
        description="Batches with attendance or homework history cannot be deleted — deactivate them instead."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteBatch) return
          const res = await fetch(`/api/batches/${deleteBatch.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success('Batch deleted.')
          router.refresh()
        }}
      />
    </div>
  )
}

// ---------- Batch form ----------

function BatchFormDialog({
  open,
  batch,
  courses,
  teachers,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  batch?: BatchRow | null
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
  teachers: { id: string; name: string }[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [courseId, setCourseId] = useState('')
  const [levelId, setLevelId] = useState('NONE')
  const [teacherId, setTeacherId] = useState('NONE')
  const [days, setDays] = useState<string[]>(['Mon', 'Wed', 'Fri'])
  const [startTime, setStartTime] = useState('16:00')
  const [endTime, setEndTime] = useState('17:00')
  const [room, setRoom] = useState('')
  const [maxStudents, setMaxStudents] = useState(20)
  const [initId, setInitId] = useState<string | null>(null)

  // sync when dialog opens with a batch
  if (batch && initId !== batch.id) {
    setInitId(batch.id)
    setName(batch.name)
    setCourseId(batch.courseId)
    setLevelId(batch.levelId ?? 'NONE')
    setTeacherId(batch.teacherId ?? 'NONE')
    setDays(batch.days.split(',').map((d) => d.trim()))
    setStartTime(batch.startTime)
    setEndTime(batch.endTime)
    setRoom(batch.room ?? '')
    setMaxStudents(batch.maxStudents)
  }
  if (!batch && open && initId !== 'new') {
    setInitId('new')
    setName('')
    setCourseId('')
    setLevelId('NONE')
    setTeacherId('NONE')
    setDays(['Mon', 'Wed', 'Fri'])
    setStartTime('16:00')
    setEndTime('17:00')
    setRoom('')
    setMaxStudents(20)
  }

  const course = courses.find((c) => c.id === courseId)

  function toggleDay(day: string) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function submit() {
    if (!name.trim() || !courseId || days.length === 0) {
      toast.error('Name, course and at least one day are required.')
      return
    }
    if (startTime >= endTime) {
      toast.error('End time must be after start time.')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        name: name.trim(),
        courseId,
        levelId: levelId === 'NONE' ? null : levelId,
        teacherId: teacherId === 'NONE' ? null : teacherId,
        days: days.join(','),
        startTime,
        endTime,
        room: room || null,
        maxStudents,
        ...(batch ? { isActive: batch.isActive } : {}),
      }
      const res = await fetch(batch ? `/api/batches/${batch.id}` : '/api/batches', {
        method: batch ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(batch ? 'Batch updated.' : 'Batch created.')
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
      title={batch ? `Edit ${batch.name}` : 'Add Batch'}
      description="Set the weekly schedule. Students are added after the batch is created."
      onSubmit={submit}
      submitting={submitting}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Batch Name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Junior Abacus — Evening A" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Course *</label>
          <Select
            value={courseId || undefined}
            onValueChange={(v) => {
              setCourseId(v)
              setLevelId('NONE')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Level</label>
          <Select value={levelId} onValueChange={setLevelId} disabled={!course}>
            <SelectTrigger>
              <SelectValue placeholder="Any level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Any level</SelectItem>
              {course?.levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Teacher</label>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Assign later" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Assign later</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Room</label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Room 1" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-sm font-medium">Days *</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  days.includes(d)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-secondary'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Start Time *</label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">End Time *</label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Max Students *</label>
          <Input
            type="number"
            min="1"
            max="200"
            value={maxStudents}
            onChange={(e) => setMaxStudents(Number(e.target.value))}
          />
        </div>
      </div>
    </FormDialog>
  )
}

// ---------- Manage students ----------

function ManageStudentsDialog({
  batch,
  students,
  onOpenChange,
  onSuccess,
}: {
  batch: BatchRow | null
  students: { id: string; fullName: string }[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const memberIds = new Set(batch?.members.map((m) => m.id) ?? [])
  const candidates = students
    .filter((s) => !memberIds.has(s.id))
    .filter((s) => s.fullName.toLowerCase().includes(search.toLowerCase()))

  async function addStudents() {
    if (!batch || selected.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/batches/${batch.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selected }),
      })
      const data = (await res.json()) as { added?: number; warnings?: string[]; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to add students.')
        return
      }
      toast.success(`${data.added} student(s) added.`)
      if (data.warnings && data.warnings.length > 0) {
        toast.warning(data.warnings.join('\n'), { duration: 8000 })
      }
      setSelected([])
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeStudent(studentId: string) {
    if (!batch) return
    const res = await fetch(`/api/batches/${batch.id}/students?studentId=${studentId}`, {
      method: 'DELETE',
    })
    if (!res.ok) toast.error(await fetchApiError(res))
    else toast.success('Student removed.')
    onSuccess()
  }

  return (
    <FormDialog
      open={!!batch}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) setSelected([])
      }}
      title={`Students — ${batch?.name ?? ''}`}
      description={`${batch?.studentCount ?? 0} of ${batch?.maxStudents ?? 0} seats used.`}
      onSubmit={addStudents}
      submitting={submitting}
      submitLabel={`Add Selected (${selected.length})`}
      wide
    >
      <div className="space-y-4">
        {batch && batch.members.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Current Members</p>
            <div className="flex flex-wrap gap-2">
              {batch.members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm"
                >
                  {m.fullName}
                  <button
                    type="button"
                    onClick={() => removeStudent(m.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${m.fullName}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-medium">Add Students</p>
          <Input
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
            {candidates.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No students found.</p>
            ) : (
              candidates.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-border p-2.5 last:border-0 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() =>
                      setSelected((prev) =>
                        prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                      )
                    }
                    className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                  />
                  <span className="text-sm">{s.fullName}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </FormDialog>
  )
}
