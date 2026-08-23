import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getTeacher } from '@/server/services/teachers'
import { listCourses } from '@/server/services/courses'
import { listBatches } from '@/server/services/batches'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/shared/page-header'
import { TeacherDetailClient } from './teacher-detail-client'

export const metadata = { title: 'Teacher Details' }

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id } = await params

  const teacher = await getTeacher(id)
  if (!teacher) notFound()

  const [courses, batches, students] = await Promise.all([
    listCourses(),
    listBatches({ teacherId: id }),
    db.enrollment.findMany({
      where: { teacherId: id, status: 'ACTIVE' },
      include: {
        student: { select: { id: true, fullName: true, status: true } },
        course: { select: { name: true } },
        currentLevel: { select: { name: true } },
      },
      orderBy: { student: { fullName: 'asc' } },
      take: 50,
    }),
  ])

  return (
    <div>
      <Link
        href="/teachers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Teachers
      </Link>

      <PageHeader title={teacher.fullName} description={teacher.branch ?? undefined} />

      <TeacherDetailClient
        isAdmin={user.role === 'ADMIN'}
        teacher={{
          id: teacher.id,
          fullName: teacher.fullName,
          phone: teacher.phone,
          email: teacher.email,
          address: teacher.address,
          branch: teacher.branch,
          qualification: teacher.qualification,
          experience: teacher.experience,
          bio: teacher.bio,
          isActive: teacher.isActive,
          createdAt: teacher.createdAt,
          courses: teacher.courses.map((c) => ({
            id: c.course.id,
            name: c.course.name,
          })),
          levels: teacher.levels.map((l) => ({
            id: l.level.id,
            name: l.level.name,
            courseId: l.level.courseId,
          })),
          user: teacher.users[0]
            ? {
                id: teacher.users[0].id,
                username: teacher.users[0].username,
                isActive: teacher.users[0].isActive,
                lastLoginAt: teacher.users[0].lastLoginAt,
              }
            : null,
          activeStudentCount: teacher._count.enrollments,
          activeBatchCount: teacher._count.batches,
        }}
        courses={courses.map((c) => ({
          id: c.id,
          name: c.name,
          levels: c.levels
            .filter((l) => l.isActive)
            .map((l) => ({ id: l.id, name: l.name })),
        }))}
        batches={batches.map((b) => ({
          id: b.id,
          name: b.name,
          days: b.days,
          startTime: b.startTime,
          endTime: b.endTime,
          courseName: b.course.name,
          studentCount: b._count.students,
          isActive: b.isActive,
        }))}
        students={students.map((e) => ({
          id: e.id,
          studentId: e.student.id,
          studentName: e.student.fullName,
          courseName: e.course.name,
          levelName: e.currentLevel?.name ?? '—',
          studentStatus: e.student.status,
        }))}
      />
    </div>
  )
}
