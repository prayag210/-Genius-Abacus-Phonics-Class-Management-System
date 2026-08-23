'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, PencilLine, Plus, Trash2 } from 'lucide-react'

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
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { formatDate, todayISO } from '@/lib/utils'

type Submission = {
  studentId: string
  studentName: string
  status: string
  remarks: string | null
}

type HomeworkRow = {
  id: string
  title: string
  description: string | null
  courseName: string | null
  levelName: string | null
  batchName: string | null
  dueDate: Date
  createdByName: string | null
  submissionCount: number
  submissions: Submission[]
}

export function HomeworkClient({
  homework,
  courses,
  batches,
}: {
  homework: HomeworkRow[]
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
  batches: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteHomework, setDeleteHomework] = useState<HomeworkRow | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const pending = homework.reduce(
    (s, h) => s + h.submissions.filter((x) => x.status === 'PENDING').length,
    0
  )
  const reviewed = homework.reduce(
    (s, h) => s + h.submissions.filter((x) => x.status === 'REVIEWED').length,
    0
  )

  return (
    <div>
      <PageHeader
        title="Homework"
        description="Assign homework and track submissions per student."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Assign Homework
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Assignments" value={homework.length} icon={PencilLine} />
        <StatCard label="Pending" value={pending} iconClassName="bg-amber-500/10 text-amber-600" />
        <StatCard label="Submitted" value={homework.reduce((s, h) => s + h.submissions.filter((x) => x.status === 'SUBMITTED').length, 0)} />
        <StatCard label="Reviewed" value={reviewed} iconClassName="bg-emerald-500/10 text-emerald-600" />
      </div>

      {homework.length === 0 ? (
        <EmptyState
          icon={PencilLine}
          title="No homework assigned yet"
          description="Create homework for a batch — submissions are tracked per student automatically."
          action={{ label: 'Assign Homework', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {homework.map((h) => {
            const isOpen = expanded === h.id
            const overdue = new Date(h.dueDate) < new Date() && h.submissions.some((s) => s.status === 'PENDING')
            return (
              <Card key={h.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{h.title}</h3>
                        {overdue && <DomainStatusBadge status="OVERDUE" />}
                      </div>
                      {h.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[h.courseName, h.levelName, h.batchName].filter(Boolean).join(' · ') || 'General'}
                        {' · '}Due {formatDate(h.dueDate)}
                        {h.createdByName ? ` · By ${h.createdByName}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setExpanded(isOpen ? null : h.id)}>
                        {h.submissionCount} Submission{h.submissionCount === 1 ? '' : 's'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteHomework(h)}
                        aria-label="Delete homework"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 border-t border-border pt-4">
                      {h.submissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No students tracked. Submissions are created automatically for batch homework.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {h.submissions.map((s) => (
                            <div
                              key={s.studentId}
                              className="flex flex-col gap-2 rounded-lg border border-border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{s.studentName}</p>
                                {s.remarks && (
                                  <p className="text-xs text-muted-foreground">{s.remarks}</p>
                                )}
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                {['PENDING', 'SUBMITTED', 'REVIEWED'].map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={async () => {
                                      const res = await fetch(`/api/homework/${h.id}/submissions`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ studentId: s.studentId, status: st }),
                                      })
                                      if (!res.ok) toast.error(await fetchApiError(res))
                                      else {
                                        toast.success(`${s.studentName}: ${st.toLowerCase()}`)
                                        router.refresh()
                                      }
                                    }}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors min-h-8 ${
                                      s.status === st
                                        ? st === 'PENDING'
                                          ? 'border-border bg-secondary'
                                          : st === 'SUBMITTED'
                                            ? 'border-sky-500/40 bg-sky-500/10 text-sky-700'
                                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                                    }`}
                                  >
                                    {st.charAt(0) + st.slice(1).toLowerCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CreateHomeworkDialog
        open={createOpen}
        courses={courses}
        batches={batches}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleteHomework}
        onOpenChange={(o) => !o && setDeleteHomework(null)}
        title={`Delete "${deleteHomework?.title ?? ''}"?`}
        description="Submission tracking for this homework will also be removed."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteHomework) return
          const res = await fetch(`/api/homework/${deleteHomework.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success('Homework deleted.')
          router.refresh()
        }}
      />
    </div>
  )
}

function CreateHomeworkDialog({
  open,
  courses,
  batches,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
  batches: { id: string; name: string }[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('NONE')
  const [levelId, setLevelId] = useState('NONE')
  const [batchId, setBatchId] = useState('NONE')
  const [dueDate, setDueDate] = useState(todayISO())

  const course = courses.find((c) => c.id === courseId)

  async function submit() {
    if (!title.trim() || !dueDate) {
      toast.error('Title and due date are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          courseId: courseId === 'NONE' ? null : courseId,
          levelId: levelId === 'NONE' ? null : levelId,
          batchId: batchId === 'NONE' ? null : batchId,
          dueDate,
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Homework assigned.')
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
      title="Assign Homework"
      description="If a batch is selected, all its students are tracked automatically."
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 practice sums" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions for students…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Course</label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setLevelId('NONE') }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">General</SelectItem>
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
            <Select value={levelId} onValueChange={setLevelId} disabled={courseId === 'NONE'}>
              <SelectTrigger>
                <SelectValue />
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Batch</label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No batch (general)</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Due Date *</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>
    </FormDialog>
  )
}
