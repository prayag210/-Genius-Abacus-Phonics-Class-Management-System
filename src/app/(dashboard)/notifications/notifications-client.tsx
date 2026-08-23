'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bell, CheckCheck, Plus, Send } from 'lucide-react'

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
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { cn, formatDateTime } from '@/lib/utils'

type NotificationRow = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: Date
}

const TYPE_STYLES: Record<string, string> = {
  INFO: 'border-sky-500/30 bg-sky-500/5',
  WARNING: 'border-amber-500/30 bg-amber-500/5',
  SUCCESS: 'border-emerald-500/30 bg-emerald-500/5',
}

export function NotificationsClient({
  isAdmin,
  notifications,
}: {
  isAdmin: boolean
  notifications: NotificationRow[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const unread = notifications.filter((n) => !n.isRead).length

  async function markAllRead() {
    const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    // mark-all via PUT on each is clunky; use bulk action below
    void res
  }

  async function markRead(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: 'PUT' })
    if (!res.ok) toast.error(await fetchApiError(res))
    else router.refresh()
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Announcements and alerts for administrators and teachers."
        actions={
          <>
            {unread > 0 && (
              <Button
                variant="outline"
                onClick={async () => {
                  // mark all read one by one (fine for this scale)
                  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
                  await Promise.all(
                    unreadIds.map((id) =>
                      fetch(`/api/notifications/${id}`, { method: 'PUT' })
                    )
                  )
                  toast.success('All notifications marked as read.')
                  router.refresh()
                }}
              >
                <CheckCheck className="h-4 w-4" /> Mark all read ({unread})
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New Announcement
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={notifications.length} icon={Bell} />
        <StatCard label="Unread" value={unread} iconClassName="bg-amber-500/10 text-amber-600" />
        <StatCard label="This Week" value={notifications.filter((n) => Date.now() - new Date(n.createdAt).getTime() < 7 * 86400000).length} />
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Announcements from the administrator will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={cn('border', TYPE_STYLES[n.type] ?? 'border-border')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{n.title}</h3>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                      )}
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {n.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateNotificationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function CreateNotificationDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('INFO')
  const [role, setRole] = useState('TEACHER')

  async function submit() {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          role: role === 'ALL' ? null : role,
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Announcement sent.')
      setTitle('')
      setMessage('')
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
      title="New Announcement"
      description="Send an announcement to teachers or everyone."
      onSubmit={submit}
      submitting={submitting}
      submitLabel="Send"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Staff meeting on Saturday" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message *</label>
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Announcement details…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Audience</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEACHER">Teachers</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
                <SelectItem value="ALL">Everyone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </FormDialog>
  )
}
