import { NextRequest } from 'next/server'
import { withAuth, parseBody, ok, handleDbError } from '@/lib/api'
import { certificateCreateSchema } from '@/lib/validations/institute'
import { listCertificates, createCertificate } from '@/server/services/institute'
import { logActivity } from '@/server/services/activity'

export const GET = withAuth(
  async (req: NextRequest) => {
    const studentId = req.nextUrl.searchParams.get('studentId') ?? undefined
    const certificates = await listCertificates({ studentId })
    return ok({ certificates })
  },
  { action: 'certificates:read' }
)

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const input = await parseBody(req, certificateCreateSchema)
    try {
      const certificate = await createCertificate({
        ...input,
        issuedById: user.teacher?.id ?? null,
      })
      await logActivity({
        userId: user.id,
        userName: user.username,
        action: 'ISSUE',
        entity: 'Certificate',
        entityId: certificate.id,
        details: `${certificate.serialNumber} — ${certificate.title}`,
      })
      return ok({ certificate }, 201)
    } catch (err) {
      return handleDbError(err)
    }
  },
  { action: 'certificates:manage' }
)
