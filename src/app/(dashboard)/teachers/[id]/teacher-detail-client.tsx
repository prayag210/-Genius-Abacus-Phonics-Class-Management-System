'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, KeyRound, Layers, Users, GraduationCap, LibraryBig } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { DataTable, type Column } from '@/components/shared/data-table'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import Link from 'next/link'
import { formatDate, formatTime12h } from '@/lib/utils'

type TeacherDetail = {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  address: string | null
  branch: string | null
  qualification: string | null
  experience: string | null
  bio: string | null
  isActive: boolean
  createdAt: Date
  courses: { id: string; name: string }[]
  levels: { id: string; name: string; courseId: string }[]
  user: { id: string; username: string; isActive: boolean; lastLoginAt: Date | null } | null
  activeStudentCount: number
  activeBatchCount: number
}

export function TeacherDetailClient({
  isAdmin,
  teacher,
  courses,
  batches,
  students,
}: {
  isAdmin: boolean
  teacher: TeacherDetail
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
  batches: {
    id: string
    name: string
    days: string
    startTime: string
    endTime: string
    courseName: string
    studentCount: number
    isActive: boolean
  }[]
  students: {
    id: string
    studentId: string
    studentName: string
    courseName: string
    levelName: string
    studentStatus: string
  }[]
}) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active Students" value={teacher.activeStudentCount} icon={Users} />
        <StatCard label="Active Batches" value={teacher.activeBatchCount} icon={LibraryBig} />
        <StatCard label="Courses Assigned" value={teacher.courses.length} icon={GraduationCap} />
        <StatCard
          label="Status"
          value={teacher.isActive ? 'Active' : 'Inactive'}
          icon={CalendarClock}
          iconClassName={teacher.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Full Name" value={teacher.fullName} />
            <DetailRow label="Phone" value={teacher.phone} />
            <DetailRow label="Email" value={teacher.email} />
            <DetailRow label="Branch" value={teacher.branch} />
            <DetailRow label="Qualification" value={teacher.qualification} />
            <DetailRow label="Experience" value={teacher.experience} />
            <DetailRow label="Address" value={teacher.address} />
            <DetailRow label="Joined" value={formatDate(teacher.createdAt)} />
            {teacher.bio && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Bio</p>
                <p className="mt-1 text-sm leading-relaxed">{teacher.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignments + login */}
        <div className="space-y-4 lg:col-span-2">
          <AssignmentsCard isAdmin={isAdmin} teacher={teacher} courses={courses} />
          <LoginCard isAdmin={isAdmin} teacher={teacher} />
        </div>
      </div>

      {/* Batches */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState icon={LibraryBig} title="No batches assigned" description="This teacher has no batch assignments yet." className="border-0 bg-transparent py-6" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batches.map((b) => (
                <Link
                  key={b.id}
                  href={`/batches`}
                  className="rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <DomainStatusBadge status={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.courseName} · {b.studentCount} student(s)
                  </p>
                  <p className="mt-1 text-xs">
                    {b.days} · {formatTime12h(b.startTime)}–{formatTime12h(b.endTime)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Students (active enrollments)</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <EmptyState icon={Users} title="No students assigned" description="Students appear here when enrolled with this teacher." className="border-0 bg-transparent py-6" />
          ) : (
            <ul className="divide-y divide-border">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/students/${s.studentId}`} className="truncate text-sm font-medium hover:text-primary hover:underline">
                      {s.studentName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {s.courseName} · {s.levelName}
                    </p>
                  </div>
                  <DomainStatusBadge status={s.studentStatus} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-right text-sm break-words">{value || '—'}</span>
    </div>
  )
}

// ---------- Assignments card ----------

function AssignmentsCard({
  isAdmin,
  teacher,
  courses,
}: {
  isAdmin: boolean
  teacher: TeacherDetail
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const assignedCourseIds = teacher.courses.map((c) => c.id)
  const assignedLevelIds = teacher.levels.map((l) => l.id)

  const [selectedCourses, setSelectedCourses] = useState<string[]>(assignedCourseIds)
  const [selectedLevels, setSelectedLevels] = useState<string[]>(assignedLevelIds)

  function toggleCourse(courseId: string) {
    setSelectedCourses((prev) => {
      const next = prev.includes(courseId) ? prev.filter((c) => c !== courseId) : [...prev, courseId]
      if (!next.includes(courseId)) {
        // remove levels of this course
        const course = courses.find((c) => c.id === courseId)
        const levelIds = course?.levels.map((l) => l.id) ?? []
        setSelectedLevels((lv) => lv.filter((id) => !levelIds.includes(id)))
      }
      return next
    })
  }

  function toggleLevel(levelId: string) {
    setSelectedLevels((prev) =>
      prev.includes(levelId) ? prev.filter((l) => l !== levelId) : [...prev, levelId]
    )
  }

  async function save() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/teachers/${teacher.id}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: selectedCourses, levelIds: selectedLevels }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Assignments updated.')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Courses & Levels</CardTitle>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Layers className="h-4 w-4" /> Manage
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {teacher.courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {teacher.courses.map((c) => {
              const levels = teacher.levels.filter((l) => l.courseId === c.id)
              return (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{c.name}</p>
                  {levels.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {levels.map((l) => (
                        <span key={l.id} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                          {l.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">All levels (no specific level assignment)</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (o) {
            setSelectedCourses(assignedCourseIds)
            setSelectedLevels(assignedLevelIds)
          }
        }}
        title="Manage Assignments"
        description="Select the courses and levels this teacher will handle."
        onSubmit={save}
        submitting={submitting}
        submitLabel="Save Assignments"
        wide
      >
        <div className="space-y-4">
          {courses.map((course) => {
            const courseChecked = selectedCourses.includes(course.id)
            return (
              <div key={course.id} className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2.5 font-medium text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courseChecked}
                    onChange={() => toggleCourse(course.id)}
                    className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                  />
                  {course.name}
                </label>
                {courseChecked && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 pl-6">
                    {course.levels.map((level) => (
                      <label key={level.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLevels.includes(level.id)}
                          onChange={() => toggleLevel(level.id)}
                          className="h-3.5 w-3.5 rounded border-border accent-[var(--primary)]"
                        />
                        {level.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </FormDialog>
    </Card>
  )
}

// ---------- Login account card ----------

function LoginCard({ isAdmin, teacher }: { isAdmin: boolean; teacher: TeacherDetail }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'CREATE' | 'RESET_PASSWORD'>('CREATE')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const account = teacher.user

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/teachers/${teacher.id}/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          username: username || account?.username || 'x',
          password: password || 'x',
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(mode === 'CREATE' ? 'Login account created.' : 'Password reset.')
      setOpen(false)
      setUsername('')
      setPassword('')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleAccount(active: boolean) {
    const res = await fetch(`/api/teachers/${teacher.id}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: active ? 'ACTIVATE' : 'DEACTIVATE',
        username: account?.username ?? 'x',
        password: 'x',
      }),
    })
    if (!res.ok) toast.error(await fetchApiError(res))
    else {
      toast.success(active ? 'Login enabled.' : 'Login disabled.')
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Login Account</CardTitle>
        {isAdmin && !account && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMode('CREATE')
              setOpen(true)
            }}
          >
            <KeyRound className="h-4 w-4" /> Create Login
          </Button>
        )}
        {isAdmin && account && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMode('RESET_PASSWORD')
              setUsername(account.username)
              setOpen(true)
            }}
          >
            Reset Password
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!account ? (
          <p className="text-sm text-muted-foreground">
            No login account. The teacher cannot sign in until an account is created.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Username</span>
              <span className="font-medium">@{account.username}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <DomainStatusBadge status={account.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Last login</span>
              <span>{account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Never'}</span>
            </div>
            {isAdmin && (
              <Button
                variant={account.isActive ? 'destructive' : 'default'}
                size="sm"
                className="mt-2"
                onClick={() => toggleAccount(!account.isActive)}
              >
                {account.isActive ? 'Disable login' : 'Enable login'}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={mode === 'CREATE' ? 'Create Login Account' : 'Reset Password'}
        description={
          mode === 'CREATE'
            ? 'The teacher will use these credentials to sign in.'
            : `Set a new password for @${account?.username}. Their sessions will be signed out.`
        }
        onSubmit={submit}
        submitting={submitting}
      >
        <div className="space-y-4">
          {mode === 'CREATE' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="login-username">
                Username *
              </label>
              <Input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. jalpa"
                autoCapitalize="none"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="login-password">
              {mode === 'CREATE' ? 'Password *' : 'New password *'}
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>
        </div>
      </FormDialog>
    </Card>
  )
}
