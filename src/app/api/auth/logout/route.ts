import { NextResponse } from 'next/server'
import { destroySession, getSessionUser } from '@/lib/auth'
import { logActivity } from '@/server/services/activity'

export async function POST() {
  const user = await getSessionUser()
  await destroySession()
  if (user) {
    await logActivity({
      userId: user.id,
      userName: user.username,
      action: 'LOGOUT',
      entity: 'User',
      entityId: user.id,
    })
  }
  return NextResponse.json({ ok: true })
}
