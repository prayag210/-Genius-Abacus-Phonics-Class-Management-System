import { requireUser } from '@/lib/auth'
import { listCourses } from '@/server/services/courses'
import { CoursesClient } from './courses-client'

export const metadata = { title: 'Courses' }

export default async function CoursesPage() {
  const user = await requireUser()
  const courses = await listCourses()

  return (
    <CoursesClient
      isAdmin={user.role === 'ADMIN'}
      courses={courses.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        isActive: c.isActive,
        defaultFeePerLevel: Number(c.defaultFeePerLevel),
        activeEnrollments: c._count.enrollments,
        levels: c.levels.map((l) => ({
          id: l.id,
          levelNumber: l.levelNumber,
          name: l.name,
          fee: Number(l.fee),
          isActive: l.isActive,
          duration: l.duration,
          description: l.description,
        })),
      }))}
    />
  )
}
