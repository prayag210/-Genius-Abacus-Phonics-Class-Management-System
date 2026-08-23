/**
 * Parent service — CRUD + children listing.
 */
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { Prisma } from '@prisma/client'
import type { ParentCreateInput } from '@/lib/validations/student'

const parentInclude = {
  students: {
    select: { id: true, fullName: true, status: true },
    orderBy: { fullName: 'asc' },
  },
} satisfies Prisma.ParentInclude

export type ParentWithChildren = Prisma.ParentGetPayload<{ include: typeof parentInclude }>

export async function listParents(params: { q?: string }): Promise<ParentWithChildren[]> {
  const where: Prisma.ParentWhereInput = {}
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: 'insensitive' } },
      { phone: { contains: params.q, mode: 'insensitive' } },
      { email: { contains: params.q, mode: 'insensitive' } },
    ]
  }
  return db.parent.findMany({ where, include: parentInclude, orderBy: { name: 'asc' } })
}

export async function getParent(id: string): Promise<ParentWithChildren | null> {
  return db.parent.findUnique({ where: { id }, include: parentInclude })
}

export async function createParent(input: ParentCreateInput): Promise<Parent> {
  return db.parent.create({ data: input })
}

export async function updateParent(id: string, input: ParentCreateInput) {
  const existing = await db.parent.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Parent not found.')
  return db.parent.update({
    where: { id },
    data: input,
    include: parentInclude,
  })
}

export async function deleteParent(id: string): Promise<void> {
  const children = await db.student.count({ where: { parentId: id } })
  if (children > 0) {
    throw new ApiError(409, `This parent still has ${children} linked student(s). Unlink them first.`)
  }
  await db.parent.delete({ where: { id } })
}

export async function parentOptions() {
  return db.parent.findMany({
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' },
  })
}
