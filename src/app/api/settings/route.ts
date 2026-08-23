import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { settingsUpdateSchema } from '@/lib/validations/institute'
import { getSettings, updateSettings } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async () => {
    const settings = await getSettings()
    return ok({ settings })
  },
  { action: 'settings:manage' }
)

export const PUT = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, settingsUpdateSchema)
    try {
      const settings = await updateSettings(input)
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'UPDATE',
        entity: 'Settings',
        entityId: 'main',
      })
      return ok({ settings })
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'settings:manage' }
)
