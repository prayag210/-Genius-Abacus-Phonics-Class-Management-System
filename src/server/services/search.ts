/**
 * Global search across students, parents, teachers, courses, levels and batches.
 */
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export type SearchResults = {
  students: { id: string; label: string; sub: string }[]
  parents: { id: string; label: string; sub: string }[]
  teachers: { id: string; label: string; sub: string }[]
  courses: { id: string; label: string; sub: string }[]
  levels: { id: string; label: string; sub: string }[]
  batches: { id: string; label: string; sub: string }[]
  payments: { id: string; label: string; sub: string }[]
}

export async function globalSearch(q: string, teacherId?: string): Promise<SearchResults> {
  const mode: Prisma.QueryMode = 'insensitive'
  const like = { contains: q, mode }

  const [students, parents, teachers, courses, levels, batches, payments] = await Promise.all([
    db.student.findMany({
      where: teacherId
        ? {
            OR: [{ fullName: like }, { phone: like }],
            enrollments: { some: { teacherId } },
          }
        : {
            OR: [{ fullName: like }, { phone: like }, { parent: { name: like } }, { parent: { phone: like } }],
          },
      select: { id: true, fullName: true, phone: true, status: true, parent: { select: { name: true } } },
      take: 10,
    }),
    db.parent.findMany({
      where: { OR: [{ name: like }, { phone: like }] },
      select: { id: true, name: true, phone: true },
      take: 10,
    }),
    db.teacher.findMany({
      where: { OR: [{ fullName: like }, { phone: like }, { email: like }] },
      select: { id: true, fullName: true, branch: true },
      take: 10,
    }),
    db.course.findMany({
      where: { name: like },
      select: { id: true, name: true, description: true },
      take: 10,
    }),
    db.level.findMany({
      where: { name: like },
      include: { course: { select: { name: true } } },
      take: 10,
    }),
    db.batch.findMany({
      where: teacherId ? { name: like, teacherId } : { name: like },
      include: { course: { select: { name: true } } },
      take: 10,
    }),
    db.payment.findMany({
      where: { receiptNumber: like },
      include: { student: { select: { fullName: true } } },
      take: 10,
    }),
  ])

  return {
    students: students.map((s) => ({
      id: s.id,
      label: s.fullName,
      sub: [s.phone, s.parent?.name ? `Parent: ${s.parent.name}` : null, s.status].filter(Boolean).join(' · '),
    })),
    parents: parents.map((p) => ({
      id: p.id,
      label: p.name,
      sub: p.phone ?? '',
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      label: t.fullName,
      sub: t.branch ?? '',
    })),
    courses: courses.map((c) => ({
      id: c.id,
      label: c.name,
      sub: c.description?.slice(0, 80) ?? '',
    })),
    levels: levels.map((l) => ({
      id: l.id,
      label: `${l.course.name} — ${l.name}`,
      sub: `Level ${l.levelNumber}`,
    })),
    batches: batches.map((b) => ({
      id: b.id,
      label: b.name,
      sub: b.course.name,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      label: p.receiptNumber,
      sub: p.student.fullName,
    })),
  }
}
