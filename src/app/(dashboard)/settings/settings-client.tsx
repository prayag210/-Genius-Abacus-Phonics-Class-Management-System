'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, History, Plus, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { DomainStatusBadge, StatusBadge } from '@/components/shared/status-badge'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'

type Settings = {
  instituteName: string
  logo: string | null
  phone: string | null
  email: string | null
  address: string | null
  whatsapp: string | null
  website: string | null
  defaultFee: number
  passingPercentage: number
  skills: string[]
  paymentMethods: string[]
}

export function SettingsClient({
  settings,
  users,
  activity,
}: {
  settings: Settings
  users: {
    id: string
    username: string
    email: string | null
    role: string
    isActive: boolean
    teacherName: string | null
    lastLoginAt: Date | null
  }[]
  activity: {
    id: string
    userName: string
    action: string
    entity: string
    details: string | null
    createdAt: Date
  }[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(settings)
  const [newSkill, setNewSkill] = useState('')
  const [newMethod, setNewMethod] = useState('')

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    if (!form.instituteName.trim()) {
      toast.error('Institute name is required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          instituteName: form.instituteName.trim(),
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          whatsapp: form.whatsapp || null,
          website: form.website || null,
          logo: form.logo || null,
        }),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      toast.success('Settings saved.')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Institute configuration, skill definitions, users and activity."
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        }
      />

      <Tabs defaultValue="institute">
        <TabsList className="flex h-auto flex-wrap w-full justify-start gap-1 bg-muted/60 p-1 sm:w-fit">
          <TabsTrigger value="institute">Institute</TabsTrigger>
          <TabsTrigger value="skills">Skills & Payments</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="institute" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Institute Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Institute Name *">
                <Input value={form.instituteName} onChange={(e) => set('instituteName', e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} />
              </Field>
              <Field label="Website">
                <Input value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
              </Field>
              <Field label="Logo URL">
                <Input value={form.logo ?? ''} onChange={(e) => set('logo', e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Default Fee per Level (₹)" hint="Used when creating new courses">
                <Input
                  type="number"
                  min="0"
                  value={form.defaultFee}
                  onChange={(e) => set('defaultFee', Number(e.target.value))}
                />
              </Field>
              <Field label="Default Passing Percentage (%)" hint="Used when a test has no explicit passing marks">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.passingPercentage}
                  onChange={(e) => set('passingPercentage', Number(e.target.value))}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Skill List</CardTitle>
              <p className="text-xs text-muted-foreground">
                These skills appear as suggestions when rating student progress. Currently {form.skills.length} skill(s).
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a new skill…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                />
                <Button variant="outline" onClick={addSkill}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm"
                  >
                    {skill}
                    <button
                      onClick={() => set('skills', form.skills.filter((s) => s !== skill))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                {form.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">No skills defined.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Methods</CardTitle>
              <p className="text-xs text-muted-foreground">
                Labels for accepted payment methods (informational).
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-2">
                <Input
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  placeholder="Add a payment method…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addMethod()
                    }
                  }}
                />
                <Button variant="outline" onClick={addMethod}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.paymentMethods.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm"
                  >
                    {m}
                    <button
                      onClick={() => set('paymentMethods', form.paymentMethods.filter((x) => x !== m))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${m}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Login Accounts
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Teacher login accounts are managed from each teacher&apos;s profile page.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left">
                      <th className="p-3 font-medium">Username</th>
                      <th className="p-3 font-medium">Role</th>
                      <th className="p-3 font-medium">Linked Teacher</th>
                      <th className="p-3 font-medium">Last Login</th>
                      <th className="p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">@{u.username}</td>
                        <td className="p-3">
                          <StatusBadge label={u.role === 'ADMIN' ? 'Admin' : 'Teacher'} variant={u.role === 'ADMIN' ? 'default' : 'info'} />
                        </td>
                        <td className="p-3">{u.teacherName ?? '—'}</td>
                        <td className="p-3">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</td>
                        <td className="p-3">
                          <DomainStatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border max-h-96 overflow-y-auto">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{a.userName}</span>{' '}
                          <span className="text-muted-foreground">{a.action.toLowerCase().replace(/_/g, ' ')}</span>{' '}
                          <span className="font-medium">{a.entity}</span>
                          {a.details && <span className="text-muted-foreground"> — {a.details}</span>}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )

  function addSkill() {
    const s = newSkill.trim()
    if (!s) return
    if (form.skills.includes(s)) {
      toast.error('This skill already exists.')
      return
    }
    set('skills', [...form.skills, s])
    setNewSkill('')
  }

  function addMethod() {
    const m = newMethod.trim()
    if (!m) return
    if (form.paymentMethods.includes(m)) {
      toast.error('This method already exists.')
      return
    }
    set('paymentMethods', [...form.paymentMethods, m])
    setNewMethod('')
  }
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
