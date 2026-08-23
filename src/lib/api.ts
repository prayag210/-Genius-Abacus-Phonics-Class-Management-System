/**
 * Shared helpers for API route handlers:
 *  - withAuth wrapper: authenticates the session, checks role permissions,
 *    validates input, and converts errors into safe JSON responses.
 *  - ApiError for expected failures (404, 403, validation...).
 *
 * Every mutating API route in this application goes through withAuth.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { getApiUser, type SessionUser } from '@/lib/auth'
import { can, type Action } from '@/lib/permissions'

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

export type ApiContext<TParams> = {
  user: SessionUser
  params: TParams
}

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

function zodIssuesToDetails(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/**
 * Wraps an API route handler with authentication, authorization,
 * and consistent error handling.
 *
 * Usage:
 *   export const GET = withAuth(async (req, { user, params }) => { ... })
 *   export const POST = withAuth(handler, { action: 'students:manage' })
 */
export function withAuth<TParams = Record<string, string>>(
  handler: (req: NextRequest, ctx: ApiContext<TParams>) => Promise<NextResponse> | NextResponse,
  options?: { action?: Action; roles?: string[] }
) {
  return async (req: NextRequest, routeCtx?: { params?: Promise<TParams> }): Promise<NextResponse> => {
    try {
      const user = await getApiUser()
      if (!user) {
        return jsonError(401, 'Authentication required.')
      }

      if (options?.roles && !options.roles.includes(user.role)) {
        return jsonError(403, 'You do not have permission to perform this action.')
      }

      if (options?.action && !can(user.role, options.action)) {
        return jsonError(403, 'You do not have permission to perform this action.')
      }

      const params = routeCtx?.params ? await routeCtx.params : ({} as TParams)
      return await handler(req, { user, params })
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed.', details: zodIssuesToDetails(err) },
          { status: 422 }
        )
      }
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status })
      }
      // Unexpected error: log server-side, return a generic message
      console.error('[API] Unhandled error:', err)
      return jsonError(500, 'An unexpected error occurred. Please try again.')
    }
  }
}

/** Parse and validate a JSON body against a Zod schema. */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.')
  }
  return schema.parse(raw)
}

/** Parse and validate URL search params against a Zod schema. */
export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  const obj: Record<string, string> = {}
  req.nextUrl.searchParams.forEach((value, key) => {
    if (value !== '') obj[key] = value
  })
  return schema.parse(obj)
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data as unknown as Record<string, unknown>, { status })
}

/** Prisma known error codes -> friendly messages. ApiErrors re-throw to withAuth. */
export function handleDbError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    // Expected domain errors bubble up to withAuth for proper formatting
    throw err
  }
  const anyErr = err as { code?: string; meta?: { target?: string[] } }
  if (anyErr?.code === 'P2002') {
    const target = anyErr.meta?.target?.join(', ') ?? 'field'
    return jsonError(409, `A record with this ${target} already exists.`)
  }
  if (anyErr?.code === 'P2025') {
    return jsonError(404, 'Record not found.')
  }
  if (anyErr?.code === 'P2003') {
    return jsonError(409, 'This record is referenced by other records and cannot be deleted.')
  }
  console.error('[API] Database error:', err)
  return jsonError(500, 'A database error occurred.')
}
