'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Award,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  IndianRupee,
  NotebookPen,
  Plus,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { PaymentDialog, type PayableFeeRecord } from '@/components/shared/payment-dialog'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { formatCurrency, formatDate, initials, todayISO } from '@/lib/utils'

type LadderStep = {
  levelId: string
  levelNumber: number
  name: string
  fee: number
  status: string
  startedAt: Date | null
  completedAt: Date | null
  result: string | null
  isCurrent: boolean
}

type EnrollmentRow = {
  id: string
  courseId: string
  courseName: string
  levelId: string | null
  levelName: string | null
  teacherId: string | null
  teacherName: string | null
  batchId: string | null
  batchName: string | null
  startDate: Date
  status: string
  ladder: LadderStep[]
}

type StudentInfo = {
  id: string
  fullName: string
  dateOfBirth: Date | null
  gender: string | null
  phone: string | null
  email: string | null
  address: string | null
  admissionDate: Date
  status: string
  notes: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  parent: { id: string; name: string; phone: string | null } | null
}

export function StudentDetailClient({
  isAdmin,
  currentTeacherId,
  student,
  enrollments,
  feeRecords,
  attendance,
  attendanceStats,
  notes,
  skills,
  certificates,
  courses,
  teachers,
  testResultsCount,
}: {
  isAdmin: boolean
  currentTeacherId: string | null
  student: StudentInfo
  enrollments: EnrollmentRow[]
  feeRecords: {
    id: string
    courseName: string
    levelName: string
    totalFee: number
    paidAmount: number
    dueDate: Date | null
    status: string
  }[]
  attendance: { id: string; date: Date; status: string; batchName: string; remarks: string | null }[]
  attendanceStats: { present: number; late: number; absent: number; total: number; rate: number }
  notes: { id: string; note: string; date: Date; teacherName: string; teacherId: string | null }[]
  skills: { skillName: string; rating: number; date: Date; count: number }[]
  certificates: { id: string; serialNumber: string; title: string; type: string; issueDate: Date; levelName: string | null }[]
  courses: { id: string; name: string; levels: { id: string; name: string; fee: number }[] }[]
  teachers: { id: string; name: string }[]
  testResultsCount: number
}) {
  const router = useRouter()
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [completeEnrollment, setCompleteEnrollment] = useState<EnrollmentRow | null>(null)
  const [editEnrollment, setEditEnrollment] = useState<EnrollmentRow | null>(null)
  const [payFee, setPayFee] = useState<PayableFeeRecord | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)

  const totalPending = feeRecords
    .filter((f) => f.status !== 'PAID')
    .reduce((s, f) => s + (f.totalFee - f.paidAmount), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.fullName}
        description={`${student.parent ? `Parent: ${student.parent.name}` : 'No parent linked'} · Admitted ${formatDate(student.admissionDate)}`}
        actions={
          <>
            <DomainStatusBadge status={student.status} />
            {(isAdmin || !!currentTeacherId) && (
              <Button variant="outline" onClick={() => setNoteOpen(true)}>
                <NotebookPen className="h-4 w-4" /> Add Note
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" onClick={() => setSkillOpen(true)}>
                <TrendingUp className="h-4 w-4" /> Rate Skill
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setEnrollOpen(true)}>
                <Plus className="h-4 w-4" /> Enroll in Course
              </Button>
            )}
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Enrollments" value={enrollments.length} icon={BookOpen} />
        <StatCard label="Attendance" value={`${attendanceStats.rate}%`} hint={`${attendanceStats.present}P / ${attendanceStats.late}L / ${attendanceStats.absent}A`} icon={ClipboardCheck} />
        <StatCard
          label="Fees Pending"
          value={formatCurrency(totalPending)}
          icon={IndianRupee}
          iconClassName={totalPending > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}
        />
        <StatCard label="Tests Taken" value={testResultsCount} icon={CalendarCheck} />
      </div>

      <Tabs defaultValue="enrollments">
        <TabsList className="flex h-auto flex-wrap w-full justify-start gap-1 bg-muted/60 p-1 sm:w-fit">
          <TabsTrigger value="enrollments">Enrollments & Progress</TabsTrigger>
          <TabsTrigger value="fees">Fees & Payments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Enrollments & Progress */}
        <TabsContent value="enrollments" className="mt-4 space-y-4">
          {enrollments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No enrollments yet"
              description="Enroll this student in a course to start tracking their progress."
              action={isAdmin ? { label: 'Enroll in Course', onClick: () => setEnrollOpen(true) } : undefined}
            />
          ) : (
            enrollments.map((e) => {
              const completed = e.ladder.filter((l) => l.status === 'COMPLETED').length
              const current = e.ladder.find((l) => l.isCurrent)
              return (
                <Card key={e.id}>
                  <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{e.courseName}</CardTitle>
                        <DomainStatusBadge status={e.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Started {formatDate(e.startDate)} · Teacher: {e.teacherName ?? 'Unassigned'}
                        {e.batchName ? ` · Batch: ${e.batchName}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {current && e.status === 'ACTIVE' && (
                        <Button size="sm" onClick={() => setCompleteEnrollment(e)}>
                          Complete {current.name}
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => setEditEnrollment(e)}>
                          Manage
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {completed} of {e.ladder.length} level(s) completed
                    </p>
                    {/* Level ladder */}
                    <div className="flex flex-wrap items-stretch gap-2">
                      {e.ladder.map((step, i) => (
                        <div key={step.levelId} className="flex items-center gap-2">
                          {i > 0 && <span className="text-muted-foreground">→</span>}
                          <div
                            className={`min-w-[110px] rounded-lg border p-2.5 text-center ${
                              step.status === 'COMPLETED'
                                ? 'border-emerald-500/40 bg-emerald-500/5'
                                : step.isCurrent
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border bg-muted/30'
                            }`}
                          >
                            <p className="text-xs font-semibold">
                              {step.name}
                              {step.isCurrent && <span className="ml-1 text-primary">(current)</span>}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{formatCurrency(step.fee)}</p>
                            <div className="mt-1">
                              {step.status === 'COMPLETED' ? (
                                <p className="text-[11px] font-medium text-emerald-700">
                                  ✓ {step.completedAt ? formatDate(step.completedAt) : ''}
                                </p>
                              ) : step.isCurrent ? (
                                <p className="text-[11px] font-medium text-primary">In progress</p>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">Not started</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Fees */}
        <TabsContent value="fees" className="mt-4">
          {feeRecords.length === 0 ? (
            <EmptyState icon={IndianRupee} title="No fee records" description="Fee records appear when the student enrolls or advances a level." />
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left">
                      <th className="p-3 font-medium">Course / Level</th>
                      <th className="p-3 font-medium">Total</th>
                      <th className="p-3 font-medium">Paid</th>
                      <th className="p-3 font-medium">Remaining</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Due</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeRecords.map((f) => (
                      <tr key={f.id} className="border-b border-border last:border-0">
                        <td className="p-3">
                          <p className="font-medium">{f.courseName}</p>
                          <p className="text-xs text-muted-foreground">{f.levelName}</p>
                        </td>
                        <td className="p-3 tabular-nums">{formatCurrency(f.totalFee)}</td>
                        <td className="p-3 tabular-nums">{formatCurrency(f.paidAmount)}</td>
                        <td className="p-3 font-semibold tabular-nums">
                          {formatCurrency(f.totalFee - f.paidAmount)}
                        </td>
                        <td className="p-3">
                          <DomainStatusBadge status={f.status} />
                        </td>
                        <td className="p-3 text-xs">{f.dueDate ? formatDate(f.dueDate) : '—'}</td>
                        <td className="p-3">
                          {f.status !== 'PAID' && isAdmin && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                setPayFee({
                                  id: f.id,
                                  studentName: student.fullName,
                                  courseName: f.courseName,
                                  levelName: f.levelName,
                                  totalFee: f.totalFee,
                                  paidAmount: f.paidAmount,
                                })
                              }
                            >
                              <IndianRupee className="h-3 w-3" /> Pay
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Attendance Rate" value={`${attendanceStats.rate}%`} icon={ClipboardCheck} />
            <StatCard label="Present" value={attendanceStats.present} />
            <StatCard label="Late" value={attendanceStats.late} />
            <StatCard label="Absent" value={attendanceStats.absent} />
          </div>
          {attendance.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No attendance records" description="Attendance appears when the student's batch attendance is marked." />
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <ul className="divide-y divide-border max-h-96 overflow-y-auto">
                {attendance.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.batchName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.date)}
                        {a.remarks ? ` · ${a.remarks}` : ''}
                      </p>
                    </div>
                    <DomainStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* Skills */}
        <TabsContent value="skills" className="mt-4">
          {skills.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No skill ratings yet" description="Skill ratings are recorded by teachers from the Progress page or here." action={isAdmin ? { label: 'Rate a Skill', onClick: () => setSkillOpen(true) } : undefined} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((s) => (
                <div key={s.skillName} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{s.skillName}</p>
                    <span className="text-sm font-semibold tabular-nums">{s.rating}/5</span>
                  </div>
                  <div className="mt-2 flex gap-1" aria-label={`Rated ${s.rating} of 5`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`h-2 flex-1 rounded-full ${i <= s.rating ? 'bg-primary' : 'bg-muted'}`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last rated {formatDate(s.date)} · {s.count} rating(s)
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          {notes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No teacher notes"
              description="Notes help teachers share observations about a student."
              action={{ label: 'Add Note', onClick: () => setNoteOpen(true) }}
            />
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.teacherName}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{formatDate(n.date)}</p>
                      {(isAdmin || n.teacherId === currentTeacherId) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-destructive"
                          onClick={async () => {
                            const res = await fetch(`/api/notes/${n.id}`, { method: 'DELETE' })
                            if (!res.ok) toast.error(await fetchApiError(res))
                            else {
                              toast.success('Note deleted.')
                              router.refresh()
                            }
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed">{n.note}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials(student.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{student.fullName}</p>
                    <DomainStatusBadge status={student.status} />
                  </div>
                </div>
                <Row label="Date of Birth" value={student.dateOfBirth ? formatDate(student.dateOfBirth) : null} />
                <Row label="Gender" value={student.gender} />
                <Row label="Phone" value={student.phone} />
                <Row label="Email" value={student.email} />
                <Row label="Address" value={student.address} />
                <Row label="Admission Date" value={formatDate(student.admissionDate)} />
                <Row label="Emergency Contact" value={student.emergencyContactName ? `${student.emergencyContactName}${student.emergencyContactPhone ? ` (${student.emergencyContactPhone})` : ''}` : null} />
                {student.notes && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                    <p className="mt-1 leading-relaxed">{student.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Parent / Guardian</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {student.parent ? (
                    <>
                      <Row label="Name" value={student.parent.name} />
                      <Row label="Phone" value={student.parent.phone} />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/parents?q=${encodeURIComponent(student.parent.name)}`}>View parent record</Link>
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No parent linked.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Certificates</CardTitle>
                </CardHeader>
                <CardContent>
                  {certificates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No certificates issued.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {certificates.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium">{c.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.serialNumber} · {formatDate(c.issueDate)}
                              {c.levelName ? ` · ${c.levelName}` : ''}
                            </p>
                          </div>
                          <Award className="h-4 w-4 text-primary shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        studentId={student.id}
        studentName={student.fullName}
        courses={courses.filter((c) => !enrollments.some((e) => e.courseId === c.id))}
        teachers={teachers}
        onSuccess={() => {
          setEnrollOpen(false)
          router.refresh()
        }}
      />

      <CompleteLevelDialog
        enrollment={completeEnrollment}
        onOpenChange={(o) => !o && setCompleteEnrollment(null)}
        onSuccess={() => {
          setCompleteEnrollment(null)
          router.refresh()
        }}
      />

      <EditEnrollmentDialog
        enrollment={editEnrollment}
        teachers={teachers}
        courses={courses}
        onOpenChange={(o) => !o && setEditEnrollment(null)}
        onSuccess={() => {
          setEditEnrollment(null)
          router.refresh()
        }}
      />

      <PaymentDialog fee={payFee} open={!!payFee} onOpenChange={(o) => !o && setPayFee(null)} />

      <AddNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        studentId={student.id}
        onDone={() => {
          setNoteOpen(false)
          router.refresh()
        }}
      />

      <RateSkillDialog
        open={skillOpen}
        onOpenChange={setSkillOpen}
        studentId={student.id}
        enrollments={enrollments.map((e) => ({ id: e.id, label: e.courseName }))}
        skills={skills.map((s) => s.skillName)}
        onDone={() => {
          setSkillOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-right break-words">{value || '—'}</span>
    </div>
  )
}

// ---------- Enroll dialog ----------

function EnrollDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  courses,
  teachers,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  studentId: string
  studentName: string
  courses: { id: string; name: string; levels: { id: string; name: string; fee: number }[] }[]
  teachers: { id: string; name: string }[]
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [teacherId, setTeacherId] = useState('')

  const course = courses.find((c) => c.id === courseId)

  async function submit() {
    if (!courseId) {
      toast.error('Please select a course.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseId,
          levelId: levelId || null,
          teacherId: teacherId || null,
          createFeeRecord: true,
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(`${studentName} enrolled.`)
      setCourseId('')
      setLevelId('')
      setTeacherId('')
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
      title={`Enroll ${studentName} in a Course`}
      description="A fee record is created automatically for the starting level."
      onSubmit={submit}
      submitting={submitting}
      submitLabel="Enroll"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Course *</label>
          <Select value={courseId || undefined} onValueChange={(v) => { setCourseId(v); setLevelId('') }}>
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">Already enrolled in all courses.</div>
              ) : (
                courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Starting Level</label>
          <Select value={levelId || undefined} onValueChange={setLevelId} disabled={!course}>
            <SelectTrigger>
              <SelectValue placeholder={course ? 'First level' : 'Select a course first'} />
            </SelectTrigger>
            <SelectContent>
              {course?.levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} (₹{l.fee.toLocaleString('en-IN')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Teacher</label>
          <Select value={teacherId || 'NONE'} onValueChange={(v) => setTeacherId(v === 'NONE' ? '' : v)}>
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
      </div>
    </FormDialog>
  )
}

// ---------- Complete level dialog ----------

function CompleteLevelDialog({
  enrollment,
  onOpenChange,
  onSuccess,
}: {
  enrollment: EnrollmentRow | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState('')
  const [nextLevelId, setNextLevelId] = useState('')
  const [completeCourse, setCompleteCourse] = useState(false)

  const current = enrollment?.ladder.find((l) => l.isCurrent)
  const nextLevel = enrollment?.ladder.find(
    (l) => current && l.levelNumber === current.levelNumber + 1 && l.status === 'NOT_STARTED'
  )

  async function submit() {
    if (!enrollment) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/enrollments/${enrollment.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: result || null,
          nextLevelId: nextLevelId || null,
          completeCourse,
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      const data = (await res.json()) as { nextLevelName: string | null }
      toast.success(
        data.nextLevelName
          ? `Level completed — moved to ${data.nextLevelName}.`
          : 'Course completed!'
      )
      setResult('')
      setNextLevelId('')
      setCompleteCourse(false)
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={!!enrollment && !!current}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) {
          setResult('')
          setNextLevelId('')
          setCompleteCourse(false)
        }
      }}
      title={`Complete ${current?.name ?? ''}`}
      description={`${enrollment?.courseName ?? ''} — the level history is preserved permanently.`}
      onSubmit={submit}
      submitting={submitting}
      submitLabel="Complete & Move Forward"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Result / Remarks</label>
          <Input
            placeholder="e.g. Passed with distinction"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Next Level</label>
          <Select value={nextLevelId || 'AUTO'} onValueChange={(v) => setNextLevelId(v === 'AUTO' ? '' : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">
                Automatic ({nextLevel ? nextLevel.name : 'no next level'})
              </SelectItem>
              {enrollment?.ladder
                .filter((l) => !l.isCurrent && l.status === 'NOT_STARTED')
                .map((l) => (
                  <SelectItem key={l.levelId} value={l.levelId}>
                    {l.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={completeCourse}
            onChange={(e) => setCompleteCourse(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          This is the final level — complete the course
        </label>
        {completeCourse && (
          <p className="text-xs text-muted-foreground">
            The enrollment will be marked as completed. A certificate can be issued from the Certificates page.
          </p>
        )}
      </div>
    </FormDialog>
  )
}

// ---------- Edit enrollment dialog ----------

function EditEnrollmentDialog({
  enrollment,
  teachers,
  courses,
  onOpenChange,
  onSuccess,
}: {
  enrollment: EnrollmentRow | null
  teachers: { id: string; name: string }[]
  courses: { id: string; name: string; levels: { id: string; name: string; fee: number }[] }[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [teacherId, setTeacherId] = useState('')
  const [status, setStatus] = useState('')
  const [levelId, setLevelId] = useState('')

  const course = courses.find((c) => c.id === enrollment?.courseId)

  async function submit() {
    if (!enrollment) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {}
      if (teacherId) body.teacherId = teacherId === 'NONE' ? null : teacherId
      if (status) body.status = status
      if (levelId) body.currentLevelId = levelId
      const res = await fetch(`/api/enrollments/${enrollment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Enrollment updated.')
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={!!enrollment}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o && enrollment) {
          setTeacherId(enrollment.teacherId ?? 'NONE')
          setStatus(enrollment.status)
          setLevelId(enrollment.levelId ?? '')
        }
      }}
      title={`Manage Enrollment — ${enrollment?.courseName ?? ''}`}
      description="Update teacher, current level or status. History is never lost."
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Teacher</label>
          <Select value={teacherId || 'NONE'} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Unassigned</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Current Level</label>
          <Select value={levelId || 'KEEP'} onValueChange={(v) => setLevelId(v === 'KEEP' ? '' : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KEEP">Keep current</SelectItem>
              {course?.levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Status</label>
          <Select value={status || 'ACTIVE'} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="DROPPED">Dropped</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDialog>
  )
}

// ---------- Add note dialog ----------

function AddNoteDialog({
  open,
  onOpenChange,
  studentId,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  studentId: string
  onDone: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')

  async function submit() {
    if (!note.trim()) {
      toast.error('Please write a note first.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, note, date: todayISO() }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Note added.')
      setNote('')
      onDone()
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
      title="Add Teacher Note"
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Note *</label>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observations about the student…" />
        </div>
      </div>
    </FormDialog>
  )
}

// ---------- Rate skill dialog ----------

function RateSkillDialog({
  open,
  onOpenChange,
  studentId,
  enrollments,
  skills,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  studentId: string
  enrollments: { id: string; label: string }[]
  skills: string[]
  onDone: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [skillName, setSkillName] = useState('')
  const [rating, setRating] = useState(3)
  const [enrollmentId, setEnrollmentId] = useState('')
  const [notes, setNotes] = useState('')

  async function submit() {
    if (!skillName.trim()) {
      toast.error('Please enter a skill name.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          enrollmentId: enrollmentId || null,
          skillName,
          rating,
          notes: notes || null,
          date: todayISO(),
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(`Rated ${skillName}: ${rating}/5.`)
      setSkillName('')
      setRating(3)
      setNotes('')
      onDone()
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
      title="Record Skill Rating"
      description="Ratings from 1 (beginner) to 5 (excellent) track student progress over time."
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Skill *</label>
          <Input
            list="skill-suggestions"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="e.g. Mental Calculation"
          />
          <datalist id="skill-suggestions">
            {skills.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Rating: {rating}/5</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
            aria-label="Skill rating"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 — Beginner</span>
            <span>5 — Excellent</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Enrollment (optional)</label>
          <Select value={enrollmentId || 'NONE'} onValueChange={(v) => setEnrollmentId(v === 'NONE' ? '' : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">General</SelectItem>
              {enrollments.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context…" />
        </div>
      </div>
    </FormDialog>
  )
}
