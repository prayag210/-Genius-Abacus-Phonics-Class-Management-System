'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Award, Plus, Trash2 } from 'lucide-react'

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
import { StatCard } from '@/components/shared/stat-card'
import { DataTable, type Column } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { formatDate, todayISO } from '@/lib/utils'

type CertificateRow = {
  id: string
  serialNumber: string
  studentId: string
  studentName: string
  courseName: string | null
  levelName: string | null
  type: string
  title: string
  issueDate: Date
  issuedByName: string | null
}

export function CertificatesClient({
  certificates,
  students,
  completedLevels,
  courses,
}: {
  certificates: CertificateRow[]
  students: { id: string; name: string }[]
  completedLevels: { studentId: string; studentName: string; levelId: string; levelName: string; courseId: string }[]
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const columns: Column<CertificateRow>[] = [
    {
      key: 'serial',
      header: 'Serial #',
      render: (c) => <span className="font-mono text-xs font-medium">{c.serialNumber}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      render: (c) => (
        <Link href={`/students/${c.studentId}`} className="text-sm font-medium hover:text-primary hover:underline">
          {c.studentName}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Certificate',
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.title}</p>
          <p className="text-xs text-muted-foreground">
            {[c.courseName, c.levelName, c.type].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    {
      key: 'issued',
      header: 'Issued',
      className: 'hidden md:table-cell',
      render: (c) => (
        <div>
          <p className="text-sm">{formatDate(c.issueDate)}</p>
          {c.issuedByName && <p className="text-xs text-muted-foreground">by {c.issuedByName}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (c) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-destructive hover:bg-destructive/10"
          onClick={async () => {
            const res = await fetch(`/api/certificates/${c.id}`, { method: 'DELETE' })
            if (!res.ok) toast.error(await fetchApiError(res))
            else {
              toast.success('Certificate deleted.')
              router.refresh()
            }
          }}
          aria-label="Delete certificate"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Issue level-completion and achievement certificates with unique serial numbers."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Issue Certificate
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Certificates Issued" value={certificates.length} icon={Award} />
        <StatCard label="This Year" value={certificates.filter((c) => new Date(c.issueDate).getUTCFullYear() === new Date().getUTCFullYear()).length} />
        <StatCard label="Completed Levels" value={completedLevels.length} />
        <StatCard label="Students Certified" value={new Set(certificates.map((c) => c.studentId)).size} />
      </div>

      <DataTable
        columns={columns}
        rows={certificates}
        rowKey={(c) => c.id}
        emptyState={
          <EmptyState
            icon={Award}
            title="No certificates issued yet"
            description="Issue certificates when students complete levels or achieve milestones."
            action={{ label: 'Issue Certificate', onClick: () => setCreateOpen(true) }}
          />
        }
      />

      <CreateCertificateDialog
        open={createOpen}
        students={students}
        completedLevels={completedLevels}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function CreateCertificateDialog({
  open,
  students,
  completedLevels,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  students: { id: string; name: string }[]
  completedLevels: { studentId: string; studentName: string; levelId: string; levelName: string }[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [studentQuery, setStudentQuery] = useState('')
  const [studentId, setStudentId] = useState('')
  const [type, setType] = useState('LEVEL_COMPLETION')
  const [title, setTitle] = useState('')
  const [levelId, setLevelId] = useState('NONE')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [notes, setNotes] = useState('')

  const studentLevels = completedLevels.filter((cl) => cl.studentId === studentId)

  async function submit() {
    if (!studentId || !title.trim()) {
      toast.error('Select a student and enter a title.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          levelId: levelId === 'NONE' ? null : levelId,
          enrollmentId: null,
          type,
          title: title.trim(),
          issueDate,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      const data = (await res.json()) as { certificate: { serialNumber: string } }
      toast.success(`Certificate issued: ${data.certificate.serialNumber}`)
      setStudentId('')
      setStudentQuery('')
      setTitle('')
      setNotes('')
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
      title="Issue Certificate"
      description="A unique serial number is generated automatically."
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Student *</label>
          <Select
            value={studentId || undefined}
            onValueChange={(v) => {
              setStudentId(v)
              setLevelId('NONE')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type *</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEVEL_COMPLETION">Level Completion</SelectItem>
                <SelectItem value="COURSE_COMPLETION">Course Completion</SelectItem>
                <SelectItem value="ACHIEVEMENT">Achievement</SelectItem>
                <SelectItem value="PARTICIPATION">Participation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Issue Date *</label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Junior Abacus Level 1 Completion" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Level (optional)</label>
          <Select value={levelId} onValueChange={setLevelId} disabled={!studentId}>
            <SelectTrigger>
              <SelectValue placeholder={studentId ? 'No specific level' : 'Select a student first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No specific level</SelectItem>
              {studentLevels.map((cl) => (
                <SelectItem key={cl.levelId} value={cl.levelId}>
                  {cl.levelName} (completed)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {studentId && studentLevels.length === 0 && (
            <p className="text-xs text-muted-foreground">
              This student has no completed levels yet.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </FormDialog>
  )
}
