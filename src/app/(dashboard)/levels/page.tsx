import { requireUser } from '@/lib/auth'
import { listLevels } from '@/server/services/courses'
import { listCourses } from '@/server/services/courses'
import { db } from '@/lib/db'
import { LevelsClient } from './levels-client'

export const metadata = { title: 'Levels' }

export default async function LevelsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const [levels, courses] = await Promise.all([
    listLevels({ courseId: sp.courseId || undefined }),
    listCourses(),
  ])

  // include teacher assignments per level
  const teacherLevels = await db.teacherLevel.findMany({
    where: sp.courseId ? { level: { courseId: sp.courseId } } : {},
    include: { teacher: { select: { fullName: true } } },
  })
  const teachersByLevel = new Map<string, string[]>()
  for (const tl of teacherLevels) {
    const list = teachersByLevel.get(tl.levelId) ?? []
    list.push(tl.teacher.fullName)
    teachersByLevel.set(tl.levelId, list)
  }

  return (
    <LevelsClient
      isAdmin={user.role === 'ADMIN'}
      levels={levels.map((l) => ({
        id: l.id,
        levelNumber: l.levelNumber,
        name: l.name,
        fee: Number(l.fee),
        isActive: l.isActive,
        duration: l.duration,
        description: l.description,
        courseId: l.course.id,
        courseName: l.course.name,
        activeEnrollments: l._count.enrollments,
        batches: l._count.batches,
        teachers: teachersByLevel.get(l.id) ?? [],
      }))}
      courses={courses.map((c) => ({
        id: c.id,
        name: c.name,
        defaultFeePerLevel: Number(c.defaultFeePerLevel),
      }))}
      selectedCourseId={sp.courseId ?? ''}
    />
  )
}
