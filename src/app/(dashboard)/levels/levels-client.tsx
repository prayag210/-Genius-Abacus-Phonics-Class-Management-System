'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Layers, Trash2 } from 'lucide-react'

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
import { formatCurrency } from '@/lib/utils'
import { levelUpdateSchema } from '@/lib/validations/course'

type LevelRow = {
  id: string
  levelNumber: number
  name: string
  fee: number
  isActive: boolean
  duration: string | null
  description: string | null
  courseId: string
  courseName: string
  activeEnrollments: number
  batches: number
  teachers: string[]
}

type CourseOption = { id: string; name: string; defaultFeePerLevel: number }

export function LevelsClient({
  isAdmin,
  levels,
  courses,
  selectedCourseId,
}: {
  isAdmin: boolean
  levels: LevelRow[]
  courses: CourseOption[]
  selectedCourseId: string
}) {
  const router = useRouter()
  const [editLevel, setEditLevel] = useState<LevelRow | null>(null)
  const [deleteLevel, setDeleteLevel] = useState<LevelRow | null>(null)

  const columns: Column<LevelRow>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (l) => <span className="text-sm font-medium">{l.courseName}</span>,
    },
    {
      key: 'level',
      header: 'Level',
      render: (l) => (
        <span className="text-sm">
          <span className="text-muted-foreground">#{l.levelNumber}</span> {l.name}
        </span>
      ),
    },
    {
      key: 'fee',
      header: 'Fee',
      render: (l) => <span className="text-sm font-semibold tabular-nums">{formatCurrency(l.fee)}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      className: 'hidden lg:table-cell',
      render: (l) => <span className="text-sm">{l.duration ?? '—'}</span>,
    },
    {
      key: 'students',
      header: 'Students',
      className: 'hidden md:table-cell',
      render: (l) => <span className="text-sm tabular-nums">{l.activeEnrollments}</span>,
    },
    {
      key: 'batches',
      header: 'Batches',
      className: 'hidden lg:table-cell',
      render: (l) => <span className="text-sm tabular-nums">{l.batches}</span>,
    },
    {
      key: 'teachers',
      header: 'Teachers',
      className: 'hidden md:table-cell',
      render: (l) => (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {l.teachers.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            l.teachers.slice(0, 2).map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                {t}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => <DomainStatusBadge status={l.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-24',
            render: (l: LevelRow) => (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditLevel(l)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteLevel(l)}
                  aria-label="Delete level"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ),
          } as Column<LevelRow>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Levels"
        description="All levels across courses. Fees are stored per level and can be changed any time."
        actions={
          <Select
            value={selectedCourseId || 'ALL'}
            onValueChange={(v) => router.push(v === 'ALL' ? '/levels' : `/levels?courseId=${v}`)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by course" />
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
        }
      />

      <DataTable
        columns={columns}
        rows={levels}
        rowKey={(l) => l.id}
        emptyState={
          <EmptyState
            icon={Layers}
            title="No levels found"
            description="Levels are created from the Courses page or when a new course is added."
          />
        }
      />

      <EditLevelDialog
        level={editLevel}
        onOpenChange={(o) => !o && setEditLevel(null)}
        onSuccess={() => {
          setEditLevel(null)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleteLevel}
        onOpenChange={(o) => !o && setDeleteLevel(null)}
        title={`Delete ${deleteLevel?.name ?? ''} (${deleteLevel?.courseName ?? ''})?`}
        description="This only works if the level has no fee records, student progress records or batches linked to it."
        confirmLabel="Delete Level"
        onConfirm={async () => {
          if (!deleteLevel) return
          const res = await fetch(`/api/levels/${deleteLevel.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success('Level deleted.')
          router.refresh()
        }}
      />
    </div>
  )
}

function EditLevelDialog({
  level,
  onOpenChange,
  onSuccess,
}: {
  level: LevelRow | null
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
    resolver: zodResolver(levelUpdateSchema.omit({ courseId: true })),
    values: level
      ? {
          levelNumber: level.levelNumber,
          name: level.name,
          description: level.description,
          duration: level.duration,
          fee: level.fee,
        }
      : undefined,
  })

  async function onSubmit(values: {
    levelNumber: number
    name: string
    description: string | null
    duration: string | null
    fee: number
  }) {
    if (!level) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/levels/${level.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, isActive: level.isActive }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Level updated.')
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={!!level}
      onOpenChange={onOpenChange}
      title={`Edit ${level?.courseName ?? ''} — ${level?.name ?? ''}`}
      description="Changing the fee only affects new fee records. Existing fee records keep their original amount."
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
                  <Input {...field} />
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
              <FormLabel>Fee (₹) *</FormLabel>
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
