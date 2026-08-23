import { requireUser } from '@/lib/auth'
import { listTeachers } from '@/server/services/teachers'
import { listCourses } from '@/server/services/courses'
import { TeachersClient } from './teachers-client'

export const metadata = { title: 'Teachers' }

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; courseId?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const [teachers, courses] = await Promise.all([
    listTeachers({
      q: sp.q?.trim() || undefined,
      status: (sp.status as 'ALL' | 'ACTIVE' | 'INACTIVE') || 'ALL',
      courseId: sp.courseId || undefined,
    }),
    listCourses(),
  ])

  return (
    <TeachersClient
      isAdmin={user.role === 'ADMIN'}
      teachers={teachers.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        phone: t.phone,
        email: t.email,
        branch: t.branch,
        qualification: t.qualification,
        experience: t.experience,
        address: t.address,
        bio: t.bio,
        photoUrl: t.photoUrl,
        isActive: t.isActive,
        courses: t.courses,
        levels: t.levels,
        user: t.users[0] ?? null,
        _count: t._count,
      }))}
      courses={courses.map((c) => ({ id: c.id, name: c.name }))}
      filters={{
        q: sp.q ?? '',
        status: sp.status ?? 'ALL',
        courseId: sp.courseId ?? '',
      }}
    />
  )
}
