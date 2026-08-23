import { requireUser } from '@/lib/auth'
import { listParents } from '@/server/services/parents'
import { ParentsClient } from './parents-client'

export const metadata = { title: 'Parents' }

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const parents = await listParents({ q: sp.q?.trim() || undefined })

  return (
    <ParentsClient
      isAdmin={user.role === 'ADMIN'}
      parents={parents.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email,
        address: p.address,
        relationship: p.relationship,
        notes: p.notes,
        children: p.students.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          status: s.status,
        })),
      }))}
      filters={{ q: sp.q ?? '' }}
    />
  )
}
