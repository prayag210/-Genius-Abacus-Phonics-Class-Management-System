import { requireUser } from '@/lib/auth'
import { listStudents } from '@/server/services/students'
import { listCourses } from '@/server/services/courses'
import { teacherOptions } from '@/server/services/teachers'
import { parentOptions } from '@/server/services/parents'
import { StudentsClient } from './students-client'

export const metadata = { title: 'Students' }

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; courseId?: string; teacherId?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  // Teachers are automatically scoped to their own students
  const teacherIdFilter =
    user.role === 'TEACHER' && user.teacher ? user.teacher.id : sp.teacherId || undefined

  const [students, courses, teachers, parents] = await Promise.all([
    listStudents({
      q: sp.q?.trim() || undefined,
      status: sp.status || undefined,
      courseId: sp.courseId || undefined,
      teacherId: teacherIdFilter,
    }),
    listCourses(false),
    teacherOptions(),
    parentOptions(),
  ])

  return (
    <StudentsClient
      isAdmin={user.role === 'ADMIN'}
      students={students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        phone: s.phone,
        gender: s.gender,
        status: s.status,
        admissionDate: s.admissionDate,
        dateOfBirth: s.dateOfBirth,
        email: s.email,
        address: s.address,
        notes: s.notes,
        photoUrl: s.photoUrl,
        parentId: s.parentId,
        emergencyContactName: s.emergencyContactName,
        emergencyContactPhone: s.emergencyContactPhone,
        parent: s.parent,
        enrollments: s.enrollments.map((e) => ({
          id: e.id,
          courseId: e.course.id,
          courseName: e.course.name,
          levelName: e.currentLevel?.name ?? null,
          teacherName: e.teacher?.fullName ?? null,
          status: e.status,
        })),
      }))}
      courses={courses.map((c) => ({
        id: c.id,
        name: c.name,
        levels: c.levels.map((l) => ({ id: l.id, name: l.name, fee: Number(l.fee) })),
      }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.fullName }))}
      parents={parents.map((p) => ({ id: p.id, name: p.name, phone: p.phone }))}
      filters={{
        q: sp.q ?? '',
        status: sp.status ?? 'ALL',
        courseId: sp.courseId ?? '',
        teacherId: sp.teacherId ?? '',
      }}
      lockedTeacherId={user.role === 'TEACHER' && user.teacher ? user.teacher.id : null}
    />
  )
}
