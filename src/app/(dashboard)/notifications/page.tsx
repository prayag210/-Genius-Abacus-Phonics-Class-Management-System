import { requireUser } from '@/lib/auth'
import { listNotifications } from '@/server/services/institute'
import { NotificationsClient } from './notifications-client'

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const user = await requireUser()
  const notifications = await listNotifications(user.id, user.role)

  return (
    <NotificationsClient
      isAdmin={user.role === 'ADMIN'}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
      }))}
    />
  )
}
