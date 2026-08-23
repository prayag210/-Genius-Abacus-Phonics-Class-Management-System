'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Search, UserCog, Users, X } from 'lucide-react'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  teacherCreateSchema,
  teacherUpdateSchema,
  type TeacherCreateInput,
  type TeacherUpdateInput,
} from '@/lib/validations/teacher'

type TeacherRow = {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  branch: string | null
  qualification: string | null
  experience: string | null
  address: string | null
  bio: string | null
  photoUrl: string | null
  isActive: boolean
  courses: { course: { id: string; name: string } }[]
  levels: { level: { id: string; name: string; courseId: string } }[]
  user: { id: string; username: string; isActive: boolean } | null
  _count: { batches: number; enrollments: number }
}

export function TeachersClient({
  isAdmin,
  teachers,
  courses,
  filters,
}: {
  isAdmin: boolean
  teachers: TeacherRow[]
  courses: { id: string; name: string }[]
  filters: { q: string; status: string; courseId: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.q)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTeacher, setEditTeacher] = useState<TeacherRow | null>(null)
  const [deleteTeacher, setDeleteTeacher] = useState<TeacherRow | null>(null)
  const [toggleTeacher, setToggleTeacher] = useState<TeacherRow | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/teachers?${params.toString()}`))
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    updateFilter('q', search.trim())
  }

  function clearFilters() {
    setSearch('')
    startTransition(() => router.push('/teachers'))
  }

  const hasFilters = filters.q || filters.status !== 'ALL' || filters.courseId

  const columns: Column<TeacherRow>[] = [
    {
      key: 'name',
      header: 'Teacher',
      render: (t) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(t.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              href={`/teachers/${t.id}`}
              className="block truncate text-sm font-medium hover:text-primary hover:underline"
            >
              {t.fullName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {t.branch ?? '—'}
              {t.user ? ` · @${t.user.username}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (t) => (
        <div className="text-sm">
          <p className="truncate">{t.phone ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{t.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'courses',
      header: 'Courses',
      render: (t) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {t.courses.length === 0 ? (
            <span className="text-xs text-muted-foreground">None</span>
          ) : (
            <>
              {t.courses.slice(0, 3).map((c) => (
                <span
                  key={c.course.id}
                  className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                >
                  {c.course.name}
                </span>
              ))}
              {t.courses.length > 3 && (
                <span className="text-[11px] text-muted-foreground">+{t.courses.length - 3}</span>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'students',
      header: 'Students',
      className: 'hidden md:table-cell',
      render: (t) => (
        <span className="text-sm tabular-nums">{t._count.enrollments}</span>
      ),
    },
    {
      key: 'batches',
      header: 'Batches',
      className: 'hidden lg:table-cell',
      render: (t) => <span className="text-sm tabular-nums">{t._count.batches}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <DomainStatusBadge status={t.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-10',
            render: (t: TeacherRow) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Teacher actions">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <circle cx="12" cy="5" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="12" cy="19" r="1.6" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/teachers/${t.id}`}>View details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditTeacher(t)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setToggleTeacher(t)}>
                    {t.isActive ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTeacher(t)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as Column<TeacherRow>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Manage teaching staff, course assignments and login accounts."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, branch…"
            className="pl-9 h-9"
          />
        </form>
        <Select value={filters.status || 'ALL'} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
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
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="h-4 w-4" /> Clear
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={teachers}
        loading={pending}
        rowKey={(t) => t.id}
        emptyState={
          <EmptyState
            icon={UserCog}
            title={hasFilters ? 'No teachers match your filters' : 'No teachers yet'}
            description={
              hasFilters
                ? 'Try adjusting or clearing the filters above.'
                : 'Add your first teacher to get started.'
            }
            action={
              isAdmin && !hasFilters
                ? { label: 'Add Teacher', onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        }
      />

      <CreateTeacherDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />

      <EditTeacherDialog
        teacher={editTeacher}
        onOpenChange={(o) => !o && setEditTeacher(null)}
        onSuccess={() => {
          setEditTeacher(null)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleteTeacher}
        onOpenChange={(o) => !o && setDeleteTeacher(null)}
        title={`Delete ${deleteTeacher?.fullName ?? ''}?`}
        description="This permanently removes the teacher and their course assignments. This only works if the teacher has no enrollments, batches or other records linked to them."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTeacher) return
          const res = await fetch(`/api/teachers/${deleteTeacher.id}`, { method: 'DELETE' })
          if (!res.ok) {
            toast.error(await fetchApiError(res))
          } else {
            toast.success('Teacher deleted.')
          }
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!toggleTeacher}
        onOpenChange={(o) => !o && setToggleTeacher(null)}
        title={`${toggleTeacher?.isActive ? 'Deactivate' : 'Activate'} ${toggleTeacher?.fullName ?? ''}?`}
        description={
          toggleTeacher?.isActive
            ? 'The teacher will be hidden from active lists and their login will be disabled. Existing records are preserved.'
            : 'The teacher will be re-listed as active and their login re-enabled.'
        }
        confirmLabel={toggleTeacher?.isActive ? 'Deactivate' : 'Activate'}
        destructive={false}
        onConfirm={async () => {
          if (!toggleTeacher) return
          const res = await fetch(`/api/teachers/${toggleTeacher.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !toggleTeacher.isActive }),
          })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success(toggleTeacher.isActive ? 'Teacher deactivated.' : 'Teacher activated.')
          router.refresh()
        }}
      />
    </div>
  )
}

// ---------- Create dialog ----------

function CreateTeacherDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [createLogin, setCreateLogin] = useState(false)

  const form = useForm<TeacherCreateInput>({
    resolver: zodResolver(teacherCreateSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      address: '',
      branch: '',
      qualification: '',
      experience: '',
      bio: '',
      photoUrl: '',
      createLogin: false,
      username: '',
      password: '',
    },
  })

  async function onSubmit(values: TeacherCreateInput) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, createLogin }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(`Teacher "${values.fullName}" created.`)
      form.reset()
      setCreateLogin(false)
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
      title="Add Teacher"
      description="Create a teacher profile. An optional login account lets them sign in."
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
                <Input placeholder="e.g. Jalpa P. Patel" {...field} />
              </FormControl>
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
                <Input type="email" placeholder="Email address" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="branch"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Branch</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Genius Abacus & Phonics Class — Himatnagar" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="qualification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qualification</FormLabel>
              <FormControl>
                <Input placeholder="e.g. B.Com, Abacus Trainer Certified" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 5 years" {...field} value={field.value ?? ''} />
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
          name="bio"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Short introduction…" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Login account */}
        <div className="sm:col-span-2 rounded-lg border border-border bg-muted/40 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            Create a login account for this teacher
          </label>
          {createLogin && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. jalpa" autoCapitalize="none" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min. 8 characters" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </div>
    </FormDialog>
  )
}

// ---------- Edit dialog ----------

function EditTeacherDialog({
  teacher,
  onOpenChange,
  onSuccess,
}: {
  teacher: TeacherRow | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<TeacherUpdateInput>({
    resolver: zodResolver(teacherUpdateSchema),
    values: teacher
      ? {
          fullName: teacher.fullName,
          phone: teacher.phone ?? '',
          email: teacher.email ?? '',
          address: teacher.address ?? '',
          branch: teacher.branch ?? '',
          qualification: teacher.qualification ?? '',
          experience: teacher.experience ?? '',
          bio: teacher.bio ?? '',
          photoUrl: teacher.photoUrl ?? '',
        }
      : undefined,
  })

  async function onSubmit(values: TeacherUpdateInput) {
    if (!teacher) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Teacher updated.')
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={!!teacher}
      onOpenChange={onOpenChange}
      title={`Edit ${teacher?.fullName ?? ''}`}
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
          name="branch"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Branch</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="qualification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qualification</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
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
          name="bio"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  )
}
