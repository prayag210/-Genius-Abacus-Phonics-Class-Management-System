import { requireUser } from '@/lib/auth'
import { listBatches, getBatchStudents } from '@/server/services/batches'
import { listCourses } from '@/server/services/courses'
import { teacherOptions } from '@/server/services/teachers'
import { studentOptions } from '@/server/services/students'
import { db } from '@/lib/db'
import { BatchesClient } from './batches-client'

export const metadata = { title: 'Batches' }

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; teacherId?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const isTeacher = user.role === 'TEACHER' && !!user.teacher
  const teacherFilter = isTeacher ? user.teacher!.id : sp.teacherId || undefined

  const [batches, courses, teachers, allStudents] = await Promise.all([
    listBatches({ courseId: sp.courseId || undefined, teacherId: teacherFilter }),
    listCourses(false),
    teacherOptions(),
    isTeacher ? Promise.resolve([]) : studentOptions(),
  ])

  // fetch members for each batch
  const batchMembers = await Promise.all(
    batches.map(async (b) => ({
      batchId: b.id,
      students: (await getBatchStudents(b.id)).map((s) => ({
        id: s.id,
        fullName: s.fullName,
        status: s.status,
      })),
    }))
  )
  const membersByBatch = new Map(batchMembers.map((m) => [m.batchId, m.students]))

  return (
    <BatchesClient
      isAdmin={user.role === 'ADMIN'}
      batches={batches.map((b) => ({
        id: b.id,
        name: b.name,
        courseId: b.course.id,
        courseName: b.course.name,
        levelId: b.level?.id ?? null,
        levelName: b.level?.name ?? null,
        teacherId: b.teacher?.id ?? null,
        teacherName: b.teacher?.fullName ?? null,
        days: b.days,
        startTime: b.startTime,
        endTime: b.endTime,
        room: b.room,
        maxStudents: b.maxStudents,
        isActive: b.isActive,
        studentCount: b._count.students,
        members: membersByBatch.get(b.id) ?? [],
      }))}
      courses={courses.map((c) => ({
        id: c.id,
        name: c.name,
        levels: c.levels.map((l) => ({ id: l.id, name: l.name })),
      }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.fullName }))}
      students={allStudents}
      filters={{ courseId: sp.courseId ?? '', teacherId: sp.teacherId ?? '' }}
    />
  )
}
