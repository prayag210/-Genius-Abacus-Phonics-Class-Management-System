'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { BookOpen, ChevronDown, Layers, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { DomainStatusBadge } from '@/components/shared/status-badge'
import { StatCard } from '@/components/shared/stat-card'
import { formatCurrency } from '@/lib/utils'
import { courseCreateSchema, levelCreateSchema, type CourseCreateInput } from '@/lib/validations/course'

type LevelRow = {
  id: string
  levelNumber: number
  name: string
  fee: number
  isActive: boolean
  duration: string | null
  description: string | null
}

type CourseRow = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  defaultFeePerLevel: number
  activeEnrollments: number
  levels: LevelRow[]
}

export function CoursesClient({
  isAdmin,
  courses,
}: {
  isAdmin: boolean
  courses: CourseRow[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editCourse, setEditCourse] = useState<CourseRow | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<CourseRow | null>(null)
  const [addLevelCourse, setAddLevelCourse] = useState<CourseRow | null>(null)
  const [editLevel, setEditLevel] = useState<{ course: CourseRow; level: LevelRow } | null>(null)
  const [deleteLevel, setDeleteLevel] = useState<{ course: CourseRow; level: LevelRow } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(courses[0]?.id ?? null)

  const totalLevels = courses.reduce((sum, c) => sum + c.levels.length, 0)
  const totalStudents = courses.reduce((sum, c) => sum + c.activeEnrollments, 0)

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Programs offered by the institute, with levels and per-level fees."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Course
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Courses" value={courses.length} icon={BookOpen} />
        <StatCard label="Levels" value={totalLevels} icon={Layers} />
        <StatCard label="Active Enrollments" value={totalStudents} />
        <StatCard
          label="Highest Fee / Level"
          value={formatCurrency(Math.max(0, ...courses.flatMap((c) => c.levels.map((l) => l.fee)), 0))}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course to start enrolling students."
          action={isAdmin ? { label: 'Add Course', onClick: () => setCreateOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const isOpen = expanded === course.id
            const totalFee = course.levels.reduce((sum, l) => sum + l.fee, 0)
            return (
              <Card key={course.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : course.id)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{course.name}</h3>
                        <DomainStatusBadge status={course.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </div>
                      {course.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                          {course.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {course.levels.length} level(s) · {formatCurrency(course.defaultFeePerLevel)} default fee/level
                        {course.levels.length > 0 && ` · ${formatCurrency(totalFee)} total`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setAddLevelCourse(course)}>
                            <Plus className="h-3.5 w-3.5" /> Level
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditCourse(course)}>
                            Edit
                          </Button>
                        </>
                      )}
                      <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border bg-muted/30 p-4">
                      {course.levels.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No levels in this course yet.{' '}
                          {isAdmin && 'Use the “Level” button to add the first level.'}
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {course.levels.map((level) => (
                            <div
                              key={level.id}
                              className="group rounded-lg border border-border bg-card p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">
                                  <span className="text-muted-foreground">#{level.levelNumber}</span> {level.name}
                                </p>
                                <DomainStatusBadge status={level.isActive ? 'ACTIVE' : 'INACTIVE'} />
                              </div>
                              <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(level.fee)}</p>
                              {level.duration && (
                                <p className="text-xs text-muted-foreground">Duration: {level.duration}</p>
                              )}
                              {isAdmin && (
                                <div className="mt-2 flex gap-1.5 opacity-80 group-hover:opacity-100">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setEditLevel({ course, level })}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                    onClick={() => setDeleteLevel({ course, level })}
                                  >
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </Button>
                                </div>
                              )}
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

      {/* Create course */}
      <CourseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />

      {/* Edit course */}
      <CourseFormDialog
        course={editCourse}
        open={!!editCourse}
        onOpenChange={(o) => !o && setEditCourse(null)}
        onSuccess={() => {
          setEditCourse(null)
          router.refresh()
        }}
      />

      {/* Add level */}
      <LevelFormDialog
        open={!!addLevelCourse}
        course={addLevelCourse}
        onOpenChange={(o) => !o && setAddLevelCourse(null)}
        onSuccess={() => {
          setAddLevelCourse(null)
          router.refresh()
        }}
      />

      {/* Edit level */}
      <LevelFormDialog
        open={!!editLevel}
        course={editLevel?.course ?? null}
        level={editLevel?.level ?? null}
        onOpenChange={(o) => !o && setEditLevel(null)}
        onSuccess={() => {
          setEditLevel(null)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleteCourse}
        onOpenChange={(o) => !o && setDeleteCourse(null)}
        title={`Delete course "${deleteCourse?.name ?? ''}"?`}
        description="All levels under this course will also be removed. This only works if the course has no enrollments, batches or tests."
        confirmLabel="Delete Course"
        onConfirm={async () => {
          if (!deleteCourse) return
          const res = await fetch(`/api/courses/${deleteCourse.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success('Course deleted.')
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleteLevel}
        onOpenChange={(o) => !o && setDeleteLevel(null)}
        title={`Delete ${deleteLevel?.level.name ?? ''} from ${deleteLevel?.course.name ?? ''}?`}
        description="This only works if the level has no fee records, student progress records or batches."
        confirmLabel="Delete Level"
        onConfirm={async () => {
          if (!deleteLevel) return
          const res = await fetch(`/api/levels/${deleteLevel.level.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success('Level deleted.')
          router.refresh()
        }}
      />
    </div>
  )
}

// ---------- Course dialog ----------

function CourseFormDialog({
  open,
  course,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  course?: CourseRow | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CourseCreateInput>({
    resolver: zodResolver(courseCreateSchema),
    values: course
      ? {
          name: course.name,
          description: course.description ?? '',
          defaultFeePerLevel: course.defaultFeePerLevel,
        }
      : { name: '', description: '', defaultFeePerLevel: 4000 },
  })

  async function onSubmit(values: CourseCreateInput) {
    setSubmitting(true)
    try {
      const res = await fetch(course ? `/api/courses/${course.id}` : '/api/courses', {
        method: course ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          course ? { ...values, isActive: course.isActive } : values
        ),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(course ? 'Course updated.' : 'Course created.')
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
      title={course ? `Edit ${course.name}` : 'Add Course'}
      description={
        course
          ? 'Changes to the default fee do not update existing levels — edit individual levels to change their fees.'
          : 'Levels can be added after the course is created.'
      }
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
    >
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Junior Abacus" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="What does this course cover?" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultFeePerLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Fee per Level (₹) *</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  )
}

// ---------- Level dialog ----------

function LevelFormDialog({
  open,
  course,
  level,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  course: CourseRow | null
  level?: LevelRow | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<{
    levelNumber: number
    name: string
    description: string | null
    duration: string | null
    fee: number
  }>({
    resolver: zodResolver(levelCreateSchema.omit({ courseId: true })),
    values: {
      levelNumber: level?.levelNumber ?? (course?.levels.length ?? 0) + 1,
      name: level?.name ?? '',
      description: level?.description ?? '',
      duration: level?.duration ?? '',
      fee: level?.fee ?? course?.defaultFeePerLevel ?? 4000,
    },
  })

  async function onSubmit(values: {
    levelNumber: number
    name: string
    description: string | null
    duration: string | null
    fee: number
  }) {
    if (!course) return
    setSubmitting(true)
    try {
      const res = await fetch(level ? `/api/levels/${level.id}` : '/api/levels', {
        method: level ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(level ? { ...values, isActive: level.isActive } : { ...values, courseId: course.id }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(level ? 'Level updated.' : 'Level added.')
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
      title={level ? `Edit ${course?.name ?? ''} — ${level.name}` : `Add Level to ${course?.name ?? ''}`}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="levelNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level Number *</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Level 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="fee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fee for this Level (₹) *</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 3 months" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="What is covered in this level?" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  )
}
