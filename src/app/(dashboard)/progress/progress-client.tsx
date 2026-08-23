'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, TrendingUp } from 'lucide-react'

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

type RatingRow = {
  id: string
  studentId: string
  studentName: string
  skillName: string
  rating: number
  notes: string | null
  date: Date
  ratedBy: string | null
}

export function ProgressClient({
  userRole,
  ratings,
  availableSkills,
}: {
  userRole: string
  ratings: RatingRow[]
  availableSkills: string[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('ALL')
  const [rateOpen, setRateOpen] = useState(false)

  const skillOptions = useMemo(() => {
    const set = new Set<string>([...availableSkills, ...ratings.map((r) => r.skillName)])
    return Array.from(set).sort()
  }, [availableSkills, ratings])

  const filtered = ratings.filter((r) => {
    if (skillFilter !== 'ALL' && r.skillName !== skillFilter) return false
    if (search && !r.studentName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : '—'

  const columns: Column<RatingRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <Link href={`/students/${r.studentId}`} className="text-sm font-medium hover:text-primary hover:underline">
          {r.studentName}
        </Link>
      ),
    },
    {
      key: 'skill',
      header: 'Skill',
      render: (r) => <span className="text-sm">{r.skillName}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`h-1.5 w-4 rounded-full ${i <= r.rating ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          <span className="text-xs font-medium tabular-nums">{r.rating}/5</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      className: 'hidden md:table-cell',
      render: (r) => <span className="text-sm">{formatDate(r.date)}</span>,
    },
    {
      key: 'ratedBy',
      header: 'Rated By',
      className: 'hidden lg:table-cell',
      render: (r) => <span className="text-sm">{r.ratedBy ?? '—'}</span>,
    },
    {
      key: 'notes',
      header: 'Notes',
      className: 'hidden lg:table-cell max-w-[220px]',
      render: (r) => <span className="block truncate text-xs text-muted-foreground">{r.notes ?? '—'}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Skill Progress"
        description="Track student skill development with 1–5 ratings over time."
        actions={
          <Button onClick={() => setRateOpen(true)}>
            <TrendingUp className="h-4 w-4" /> Record Rating
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Ratings Recorded" value={ratings.length} icon={TrendingUp} />
        <StatCard label="Average Rating" value={`${avgRating}/5`} />
        <StatCard label="Skills Tracked" value={skillOptions.length} />
        <StatCard label="Students Rated" value={new Set(ratings.map((r) => r.studentId)).size} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            className="pl-9 h-9"
          />
        </div>
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-full sm:w-56 h-9">
            <SelectValue placeholder="Skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All skills</SelectItem>
            {skillOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            icon={TrendingUp}
            title={filtered.length === 0 && ratings.length > 0 ? 'No ratings match your filters' : 'No ratings yet'}
            description={
              ratings.length === 0
                ? 'Record skill ratings to track student progress. The skill list is editable from Settings.'
                : 'Try a different student or skill.'
            }
            action={ratings.length === 0 ? { label: 'Record Rating', onClick: () => setRateOpen(true) } : undefined}
          />
        }
      />

      <RateSkillDialog
        open={rateOpen}
        onOpenChange={setRateOpen}
        skills={skillOptions}
        onDone={() => {
          setRateOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function RateSkillDialog({
  open,
  onOpenChange,
  skills,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  skills: string[]
  onDone: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [studentQuery, setStudentQuery] = useState('')
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([])
  const [studentId, setStudentId] = useState('')
  const [skillName, setSkillName] = useState('')
  const [rating, setRating] = useState(3)
  const [notes, setNotes] = useState('')

  async function searchStudents(q: string) {
    setStudentQuery(q)
    if (q.trim().length < 2) {
      setStudents([])
      return
    }
    const res = await fetch(`/api/students?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = (await res.json()) as { students: { id: string; fullName: string }[] }
      setStudents(data.students.slice(0, 8))
    }
  }

  async function submit() {
    if (!studentId || !skillName.trim()) {
      toast.error('Select a student and enter a skill name.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          skillName: skillName.trim(),
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
      setStudentId('')
      setStudentQuery('')
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
      description="Ratings from 1 (beginner) to 5 (excellent)."
      onSubmit={submit}
      submitting={submitting}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Student *</label>
          <Input
            value={studentQuery}
            onChange={(e) => searchStudents(e.target.value)}
            placeholder="Type a student name to search…"
          />
          {students.length > 0 && (
            <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-border">
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStudentId(s.id)
                    setStudentQuery(s.fullName)
                    setStudents([])
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-secondary ${
                    studentId === s.id ? 'bg-primary/10 font-medium' : ''
                  }`}
                >
                  {s.fullName}
                </button>
              ))}
            </div>
          )}
          {studentId && !students.length && (
            <p className="text-xs text-emerald-600">✓ Student selected</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Skill *</label>
          <Input
            list="progress-skills"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="e.g. Mental Calculation"
          />
          <datalist id="progress-skills">
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
            aria-label="Rating"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 — Beginner</span>
            <span>5 — Excellent</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context…" />
        </div>
      </div>
    </FormDialog>
  )
}
