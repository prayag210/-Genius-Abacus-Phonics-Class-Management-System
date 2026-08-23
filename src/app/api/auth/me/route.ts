import { withAuth, ok } from '@/lib/api'

export const GET = withAuth(async (_req, { user }) => {
  return ok({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      teacher: user.teacher,
    },
  })
})
