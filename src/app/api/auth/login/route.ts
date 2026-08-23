import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { loginSchema } from '@/lib/validations/auth'
import { logActivity } from '@/server/services/activity'

export async function POST(req: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please enter both username and password.' },
        { status: 422 }
      )
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null
    const result = await login(parsed.data.username, parsed.data.password, {
      userAgent: req.headers.get('user-agent'),
      ip,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    await logActivity({
      userId: result.user.id,
      userName: result.user.username,
      action: 'LOGIN',
      entity: 'User',
      entityId: result.user.id,
      details: `Role: ${result.user.role}`,
    })

    return NextResponse.json({
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
        teacherId: result.user.teacher?.id ?? null,
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json(
      { error: 'Login failed due to a server error. Please try again.' },
      { status: 500 }
    )
  }
}
