'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Search, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { parentCreateSchema, type ParentCreateInput } from '@/lib/validations/student'

type ParentRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  relationship: string | null
  notes: string | null
  children: { id: string; fullName: string; status: string }[]
}

export function ParentsClient({
  isAdmin,
  parents,
  filters,
}: {
  isAdmin: boolean
  parents: ParentRow[]
  filters: { q: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.q)
  const [createOpen, setCreateOpen] = useState(false)
  const [editParent, setEditParent] = useState<ParentRow | null>(null)
  const [deleteParent, setDeleteParent] = useState<ParentRow | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/parents?${params.toString()}`))
  }

  const columns: Column<ParentRow>[] = [
    {
      key: 'name',
      header: 'Parent',
      render: (p) => (
        <div>
          <p className="text-sm font-medium">{p.name}</p>
          {p.relationship && <p className="text-xs text-muted-foreground">{p.relationship}</p>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (p) => (
        <div className="text-sm">
          <p>{p.phone ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{p.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'children',
      header: 'Children',
      render: (p) => (
        <div className="space-y-1">
          {p.children.length === 0 ? (
            <span className="text-xs text-muted-foreground">None linked</span>
          ) : (
            p.children.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Link
                  href={`/students/${c.id}`}
                  className="text-sm hover:text-primary hover:underline"
                >
                  {c.fullName}
                </Link>
                <DomainStatusBadge status={c.status} />
              </div>
            ))
          )}
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-28',
            render: (p: ParentRow) => (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditParent(p)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteParent(p)}
                >
                  Delete
                </Button>
              </div>
            ),
          } as Column<ParentRow>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Parents"
        description="Parent or guardian records. One parent can be linked to multiple students."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Parent
            </Button>
          )
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          updateFilter('q', search.trim())
        }}
        className="mb-4 max-w-sm relative"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email…"
          className="pl-9 h-9"
        />
        {filters.q && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setSearch('')
              updateFilter('q', '')
            }}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      <DataTable
        columns={columns}
        rows={parents}
        loading={pending}
        rowKey={(p) => p.id}
        emptyState={
          <EmptyState
            icon={Users}
            title={filters.q ? 'No parents match your search' : 'No parents yet'}
            description={
              filters.q
                ? 'Try a different search term.'
                : 'Add a parent record, then link students to it from the student form.'
            }
            action={isAdmin && !filters.q ? { label: 'Add Parent', onClick: () => setCreateOpen(true) } : undefined}
          />
        }
      />

      <ParentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />

      <ParentFormDialog
        parent={editParent}
        open={!!editParent}
        onOpenChange={(o) => !o && setEditParent(null)}
        onSuccess={() => {
          setEditParent(null)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleteParent}
        onOpenChange={(o) => !o && setDeleteParent(null)}
        title={`Delete ${deleteParent?.name ?? ''}?`}
        description="The parent record can only be deleted if no students are linked to it."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteParent) return
          const res = await fetch(`/api/parents/${deleteParent.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error(await fetchApiError(res))
          else toast.success('Parent deleted.')
          router.refresh()
        }}
      />
    </div>
  )
}

function ParentFormDialog({
  open,
  parent,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  parent?: ParentRow | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ParentCreateInput>({
    resolver: zodResolver(parentCreateSchema),
    values: parent
      ? {
          name: parent.name,
          phone: parent.phone ?? '',
          email: parent.email ?? '',
          address: parent.address ?? '',
          relationship: parent.relationship ?? '',
          notes: parent.notes ?? '',
        }
      : { name: '', phone: '', email: '', address: '', relationship: '', notes: '' },
  })

  async function onSubmit(values: ParentCreateInput) {
    setSubmitting(true)
    try {
      const res = await fetch(parent ? `/api/parents/${parent.id}` : '/api/parents', {
        method: parent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success(parent ? 'Parent updated.' : 'Parent created.')
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
      title={parent ? `Edit ${parent.name}` : 'Add Parent'}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
    >
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Rajesh Patel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
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
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Father, Mother, Guardian" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
          name="address"
          render={({ field }) => (
            <FormItem>
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
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Any notes about this parent…" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  )
}
