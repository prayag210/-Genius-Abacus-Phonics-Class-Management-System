'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileBarChart, Filter } from 'lucide-react'

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
import { cn, formatCurrency, formatDate } from '@/lib/utils'

type ReportData = {
  title: string
  columns: { key: string; label: string; type?: 'money' | 'date' | 'percent' }[]
  rows: Record<string, string | number | null>[]
  summary: { label: string; value: string }[]
}

export function ReportsClient({
  reportTypes,
  selectedType,
  report,
  error,
  filters,
  courses,
  teachers,
  batches,
  queryString,
}: {
  reportTypes: { value: string; label: string }[]
  selectedType: string
  report: ReportData | null
  error: string | null
  filters: {
    from: string
    to: string
    teacherId: string
    courseId: string
    levelId: string
    batchId: string
    status: string
  }
  courses: { id: string; name: string; levels: { id: string; name: string }[] }[]
  teachers: { id: string; name: string }[]
  batches: { id: string; name: string }[]
  queryString: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(queryString)
    if (value && value !== 'ALL') params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/reports?${params.toString()}`))
  }

  function switchType(value: string) {
    const params = new URLSearchParams()
    params.set('type', value)
    startTransition(() => router.push(`/reports?${params.toString()}`))
  }

  const selectedCourse = courses.find((c) => c.id === filters.courseId)

  function formatCell(value: string | number | null, type?: 'money' | 'date' | 'percent') {
    if (value === null || value === undefined || value === '') return '—'
    if (type === 'money') return formatCurrency(Number(value))
    if (type === 'date') return formatDate(String(value))
    return String(value)
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Institute reports with filters. All data comes live from the database."
        actions={
          report &&
          report.rows.length > 0 && (
            <Button asChild variant="outline">
              <a href={`/api/reports?${queryString || `type=${selectedType}`}&format=csv`} download>
                <Download className="h-4 w-4" /> Export CSV
              </a>
            </Button>
          )
        }
      />

      {/* Report type tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {reportTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => switchType(t.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              selectedType === t.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-secondary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-36">
              <label className="text-xs font-medium uppercase text-muted-foreground">From</label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => updateFilter('from', e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div className="w-36">
              <label className="text-xs font-medium uppercase text-muted-foreground">To</label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => updateFilter('to', e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div className="w-44">
              <label className="text-xs font-medium uppercase text-muted-foreground">Course</label>
              <Select value={filters.courseId || 'ALL'} onValueChange={(v) => updateFilter('courseId', v === 'ALL' ? '' : v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
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
            </div>
            {(selectedType === 'levels' || selectedType === 'fees') && (
              <div className="w-40">
                <label className="text-xs font-medium uppercase text-muted-foreground">Level</label>
                <Select value={filters.levelId || 'ALL'} onValueChange={(v) => updateFilter('levelId', v === 'ALL' ? '' : v)} disabled={!selectedCourse}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder={selectedCourse ? 'All levels' : 'Select course'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All levels</SelectItem>
                    {(selectedCourse?.levels ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-44">
              <label className="text-xs font-medium uppercase text-muted-foreground">Teacher</label>
              <Select value={filters.teacherId || 'ALL'} onValueChange={(v) => updateFilter('teacherId', v === 'ALL' ? '' : v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
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
            </div>
            {selectedType === 'attendance' && (
              <div className="w-44">
                <label className="text-xs font-medium uppercase text-muted-foreground">Batch</label>
                <Select value={filters.batchId || 'ALL'} onValueChange={(v) => updateFilter('batchId', v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All batches</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(selectedType === 'students' || selectedType === 'fees') && (
              <div className="w-40">
                <label className="text-xs font-medium uppercase text-muted-foreground">Status</label>
                {selectedType === 'fees' ? (
                  <Select value={filters.status || 'ALL'} onValueChange={(v) => updateFilter('status', v)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={filters.status || 'ALL'} onValueChange={(v) => updateFilter('status', v)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="LEFT">Left</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Summary */}
          {report.summary.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {report.summary.map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <Card className={cn(pending && 'opacity-60')}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="h-4 w-4" /> {report.title}
                <span className="text-xs font-normal text-muted-foreground">
                  ({report.rows.length} record{report.rows.length === 1 ? '' : 's'})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {report.rows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Filter}
                    title="No data for these filters"
                    description="Try widening the date range or clearing some filters."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left">
                        {report.columns.map((c) => (
                          <th key={c.key} className="whitespace-nowrap p-3 font-medium">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                          {report.columns.map((c) => (
                            <td
                              key={c.key}
                              className={cn(
                                'whitespace-nowrap p-3',
                                c.type === 'money' && 'tabular-nums font-medium'
                              )}
                            >
                              {formatCell(row[c.key], c.type)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
