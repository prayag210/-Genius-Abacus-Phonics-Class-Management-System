import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/server/services/institute'
import { db } from '@/lib/db'
import { SettingsClient } from './settings-client'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  await requireAdmin()

  const settings = await getSettings()
  const users = await db.user.findMany({
    include: { teacher: { select: { fullName: true } } },
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
  })
  const activity = await db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return (
    <SettingsClient
      settings={{
        instituteName: settings.instituteName,
        logo: settings.logo,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        whatsapp: settings.whatsapp,
        website: settings.website,
        defaultFee: Number(settings.defaultFee),
        passingPercentage: Number(settings.passingPercentage),
        skills: settings.skills,
        paymentMethods: settings.paymentMethods,
      }}
      users={users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        teacherName: u.teacher?.fullName ?? null,
        lastLoginAt: u.lastLoginAt,
      }))}
      activity={activity.map((a) => ({
        id: a.id,
        userName: a.userName ?? 'System',
        action: a.action,
        entity: a.entity,
        details: a.details,
        createdAt: a.createdAt,
      }))}
    />
  )
}
