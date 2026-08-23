'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { GraduationCap, Plus, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, type Column } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { initials } from '@/lib/utils'
import { GENDER_OPTIONS, STUDENT_STATUSES } from '@/lib/validations/shared'
import { studentCreateSchema, studentUpdateSchema, type StudentCreateInput } from '@/lib/validations/student'

type StudentRow = {
  id: string
  fullName: string
  phone: string | null
  gender: string | null
  status: string
  admissionDate: Date
  dateOfBirth: Date | null
  email: string | null
  address: string | null
  notes: string | null
  photoUrl: string | null
  parentId: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  parent: { id: string; name: string; phone: string | null } | null
  enrollments: {
    id: string
    courseId: string
    courseName: string
    levelName: string | null
    teacherName: string | null
    status: string
  }[]
}

type CourseOption = {
  id: string
  name: string
  levels: { id: string; name: string; fee: number }[]
}

export function StudentsClient({
  isAdmin,
  students,
  courses,
  teachers,
  parents,
  filters,
  lockedTeacherId,
}: {
  isAdmin: boolean
  students: StudentRow[]
  courses: CourseOption[]
  teachers: { id: string; name: string }[]
  parents: { id: string; name: string; phone: string | null }[]
  filters: { q: string; status: string; courseId: string; teacherId: string }
  lockedTeacherId: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.q)
  const [createOpen, setCreateOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<StudentRow | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/students?${params.toString()}`))
  }

  const hasFilters = filters.q || filters.status !== 'ALL' || filters.courseId || filters.teacherId

  const columns: Column<StudentRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (s) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(s.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              href={`/students/${s.id}`}
              className="block truncate text-sm font-medium hover:text-primary hover:underline"
            >
              {s.fullName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {s.parent ? `Parent: ${s.parent.name}` : 'No parent linked'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'enrollments',
      header: 'Enrollments',
      render: (s) => (
        <div className="space-y-0.5 max-w-[260px]">
          {s.enrollments.length === 0 ? (
            <span className="text-xs text-muted-foreground">Not enrolled</span>
          ) : (
            s.enrollments.map((e) => (
              <p key={e.id} className="truncate text-xs">
                <span className="font-medium">{e.courseName}</span>
                <span className="text-muted-foreground">
                  {' '}· {e.levelName ?? 'No level'} · {e.teacherName ?? 'Unassigned'}
                </span>
              </p>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'hidden lg:table-cell',
      render: (s) => <span className="text-sm">{s.phone ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <DomainStatusBadge status={s.status} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-28',
            render: (s: StudentRow) => (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditStudent(s)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteStudent(s)}
                >
                  Delete
                </Button>
              </div>
            ),
          } as Column<StudentRow>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Students"
        description="All students with their enrollments, levels and assigned teachers."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateFilter('q', search.trim())
          }}
          className="relative flex-1 max-w-sm"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or parent name, phone…"
            className="pl-9 h-9"
          />
        </form>
        <Select value={filters.status || 'ALL'} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STUDENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.courseId || 'ALL'} onValueChange={(v) => updateFilter('courseId', v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-44 h-9">
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
        {!lockedTeacherId && (
          <Select value={filters.teacherId || 'ALL'} onValueChange={(v) => updateFilter('teacherId', v === 'ALL' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-44 h-9">
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
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setSearch('')
              startTransition(() => router.push('/students'))
            }}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={students}
        loading={pending}
        rowKey={(s) => s.id}
        emptyState={
          <EmptyState
            icon={GraduationCap}
            title={hasFilters ? 'No students match your filters' : 'No students yet'}
            description={
              hasFilters
                ? 'Try adjusting or clearing the filters above.'
                : 'Add your first student and enroll them in a course.'
            }
            action={isAdmin && !hasFilters ? { label: 'Add Student', onClick: () => setCreateOpen(true) } : undefined}
          />
        }
      />

      <CreateStudentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
        courses={courses}
        teachers={teachers}
        parents={parents}
      />

      <EditStudentDialog
        student={editStudent}
        onOpenChange={(o) => !o && setEditStudent(null)}
        onSuccess={() => {
          setEditStudent(null)
          router.refresh()
        }}
        parents={parents}
      />

      <ConfirmDialog
        open={!!deleteStudent}
        onOpenChange={(o) => !o && setDeleteStudent(null)}
        title={`Delete ${deleteStudent?.fullName ?? ''}?`}
        description="Students with enrollments or payment history cannot be deleted — data integrity is preserved. Set their status to “Left” instead."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteStudent) return
          const res = await fetch(`/api/students/${deleteStudent.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success('Student deleted.')
          router.refresh()
        }}
      />
    </div>
  )
}

// ---------- Create dialog ----------

function CreateStudentDialog({
  open,
  onOpenChange,
  onSuccess,
  courses,
  teachers,
  parents,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
  courses: CourseOption[]
  teachers: { id: string; name: string }[]
  parents: { id: string; name: string; phone: string | null }[]
}) {
  const [submitting, setSubmitting] = useState(false)
  const [enroll, setEnroll] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')

  const form = useForm<StudentCreateInput>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: null,
      gender: '',
      phone: '',
      email: '',
      address: '',
      parentId: null,
      emergencyContactName: '',
      emergencyContactPhone: '',
      admissionDate: null,
      status: 'ACTIVE',
      notes: '',
      initialEnrollment: null,
    },
  })

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  async function onSubmit(values: StudentCreateInput) {
    setSubmitting(true)
    try {
      const payload = {
        ...values,
        initialEnrollment: enroll && selectedCourseId
          ? {
              ...values.initialEnrollment,
              courseId: selectedCourseId,
              createFeeRecord: values.initialEnrollment?.createFeeRecord ?? true,
            }
          : null,
      }
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(`Student "${values.fullName}" created.`)
      form.reset()
      setEnroll(false)
      setSelectedCourseId('')
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
      title="Add Student"
      description="Create a student record with optional first enrollment."
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Rahul Patel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ? String(field.value).slice(0, 10) : ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="Phone number" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent / Guardian</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === 'NONE' ? null : v)}
                value={field.value ?? 'NONE'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NONE">No parent linked</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.phone ? ` (${p.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="admissionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admission Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ? String(field.value).slice(0, 10) : ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emergencyContactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact Phone</FormLabel>
              <FormControl>
                <Input placeholder="Phone" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Address" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Notes about the student…" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Initial enrollment */}
        <div className="sm:col-span-2 rounded-lg border border-border bg-muted/40 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={enroll}
              onChange={(e) => setEnroll(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            Enroll in a course now
          </label>
          {enroll && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Course *</label>
                <Select
                  value={selectedCourseId || undefined}
                  onValueChange={setSelectedCourseId}
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
              <FormField
                control={form.control}
                name="initialEnrollment.levelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                      disabled={!selectedCourse}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={selectedCourse ? 'Select level' : 'Select a course first'}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(selectedCourse?.levels ?? []).map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} (₹{l.fee.toLocaleString('en-IN')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialEnrollment.teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === 'NONE' ? null : v)}
                      value={field.value ?? 'NONE'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign later" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Assign later</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                <p className="text-xs text-muted-foreground">
                  A fee record will be created automatically for the starting level
                  (fee amount comes from the level).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormDialog>
  )
}

// ---------- Edit dialog ----------

function EditStudentDialog({
  student,
  onOpenChange,
  onSuccess,
  parents,
}: {
  student: StudentRow | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
  parents: { id: string; name: string; phone: string | null }[]
}) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<StudentCreateInput>({
    resolver: zodResolver(studentUpdateSchema),
    values: student
      ? {
          fullName: student.fullName,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          phone: student.phone,
          email: student.email,
          address: student.address,
          parentId: student.parentId,
          emergencyContactName: student.emergencyContactName,
          emergencyContactPhone: student.emergencyContactPhone,
          admissionDate: student.admissionDate,
          status: student.status as 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'LEFT',
          notes: student.notes,
          photoUrl: student.photoUrl,
        }
      : undefined,
  })

  async function onSubmit(values: StudentCreateInput) {
    if (!student) return
    setSubmitting(true)
    try {
      const { initialEnrollment: _drop, ...payload } = values
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Student updated.')
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={!!student}
      onOpenChange={onOpenChange}
      title={`Edit ${student?.fullName ?? ''}`}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ? String(field.value).slice(0, 10) : ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent / Guardian</FormLabel>
              <Select onValueChange={(v) => field.onChange(v === 'NONE' ? null : v)} value={field.value ?? 'NONE'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NONE">No parent linked</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.phone ? ` (${p.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STUDENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="admissionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admission Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ? String(field.value).slice(0, 10) : ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emergencyContactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Phone</FormLabel>
              <FormControl>
                <Input placeholder="Phone" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  )
}
