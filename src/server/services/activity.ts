/**
 * Activity logging service — records who did what, for auditing.
 */
import { db } from '@/lib/db'

export async function logActivity(input: {
  userId?: string | null
  userName?: string | null
  action: string
  entity: string
  entityId?: string | null
  details?: string | null
}): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        details: input.details ?? null,
      },
    })
  } catch (err) {
    // Logging must never break the main operation
    console.error('[ActivityLog] failed to record:', err)
  }
}

export async function listActivity(limit = 100) {
  return db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
