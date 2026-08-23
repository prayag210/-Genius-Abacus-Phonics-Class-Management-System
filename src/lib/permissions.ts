/**
 * Role-based permission matrix.
 *
 * ADMIN  – full access to everything.
 * TEACHER – read/operate only on entities scoped to them.
 *
 * New roles can be added by extending the Role enum in the Prisma schema
 * and adding their allowed actions here.
 */
import type { Role } from '@prisma/client'

export type Action =
  // users & settings
  | 'users:manage'
  | 'settings:manage'
  // teachers
  | 'teachers:read'
  | 'teachers:manage'
  // students / parents
  | 'students:read'
  | 'students:manage'
  | 'parents:read'
  | 'parents:manage'
  // academics
  | 'courses:read'
  | 'courses:manage'
  | 'levels:read'
  | 'levels:manage'
  | 'batches:read'
  | 'batches:manage'
  | 'enrollments:read'
  | 'enrollments:manage'
  // operations
  | 'attendance:read'
  | 'attendance:manage'
  | 'fees:read'
  | 'fees:manage'
  | 'payments:read'
  | 'payments:manage'
  | 'tests:read'
  | 'tests:manage'
  | 'results:manage'
  | 'progress:read'
  | 'progress:manage'
  | 'homework:read'
  | 'homework:manage'
  | 'calendar:read'
  | 'calendar:manage'
  | 'expenses:read'
  | 'expenses:manage'
  | 'reports:read'
  | 'certificates:read'
  | 'certificates:manage'
  | 'notifications:read'
  | 'notifications:manage'
  | 'activity:read'
  | 'export:data'

const ADMIN_ACTIONS: Action[] = [
  'users:manage',
  'settings:manage',
  'teachers:read',
  'teachers:manage',
  'students:read',
  'students:manage',
  'parents:read',
  'parents:manage',
  'courses:read',
  'courses:manage',
  'levels:read',
  'levels:manage',
  'batches:read',
  'batches:manage',
  'enrollments:read',
  'enrollments:manage',
  'attendance:read',
  'attendance:manage',
  'fees:read',
  'fees:manage',
  'payments:read',
  'payments:manage',
  'tests:read',
  'tests:manage',
  'results:manage',
  'progress:read',
  'progress:manage',
  'homework:read',
  'homework:manage',
  'calendar:read',
  'calendar:manage',
  'expenses:read',
  'expenses:manage',
  'reports:read',
  'certificates:read',
  'certificates:manage',
  'notifications:read',
  'notifications:manage',
  'activity:read',
  'export:data',
]

// Teachers operate on data scoped to their assigned students/batches —
// the services layer enforces the scoping; these flags gate the module access.
const TEACHER_ACTIONS: Action[] = [
  'teachers:read',
  'students:read',
  'parents:read',
  'courses:read',
  'levels:read',
  'batches:read',
  'enrollments:read',
  'attendance:read',
  'attendance:manage',
  'fees:read',
  'payments:read',
  'tests:read',
  'tests:manage',
  'results:manage',
  'progress:read',
  'progress:manage',
  'homework:read',
  'homework:manage',
  'calendar:read',
  'calendar:manage',
  'reports:read',
  'certificates:read',
  'notifications:read',
]

const MATRIX: Record<Role, Action[]> = {
  ADMIN: ADMIN_ACTIONS,
  TEACHER: TEACHER_ACTIONS,
}

export function can(role: Role, action: Action): boolean {
  return MATRIX[role]?.includes(action) ?? false
}

export const isAdmin = (role: Role) => role === 'ADMIN'
