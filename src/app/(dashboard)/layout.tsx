import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AppShell } from '@/components/layout/app-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  let instituteName = 'Genius Abacus & Phonics Class'
  try {
    const settings = await db.settings.findUnique({ where: { id: 'main' } })
    if (settings?.instituteName) instituteName = settings.instituteName
  } catch {
    // fall back to default name
  }

  return (
    <AppShell
      user={{
        id: user.id,
        username: user.username,
        role: user.role,
        teacherName: user.teacher?.fullName ?? null,
      }}
      instituteName={instituteName}
    >
      {children}
    </AppShell>
  )
}
