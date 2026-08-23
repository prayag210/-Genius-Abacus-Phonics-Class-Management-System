import { requireAdmin } from '@/lib/auth'
import { listCertificates } from '@/server/services/institute'
import { listCourses } from '@/server/services/courses'
import { studentOptions } from '@/server/services/students'
import { db } from '@/lib/db'
import { CertificatesClient } from './certificates-client'

export const metadata = { title: 'Certificates' }

export default async function CertificatesPage() {
  await requireAdmin()

  const [certificates, courses, students] = await Promise.all([
    listCertificates(),
    listCourses(false),
    studentOptions(),
  ])

  // completed levels for certificate context
  const completedLevels = await db.studentLevel.findMany({
    where: { status: 'COMPLETED' },
    include: {
      student: { select: { id: true, fullName: true } },
      level: { select: { id: true, name: true, courseId: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: 200,
  })

  return (
    <CertificatesClient
      certificates={certificates.map((c) => ({
        id: c.id,
        serialNumber: c.serialNumber,
        studentId: c.student.id,
        studentName: c.student.fullName,
        courseName: c.enrollment?.course.name ?? null,
        levelName: c.level?.name ?? null,
        type: c.type,
        title: c.title,
        issueDate: c.issueDate,
        issuedByName: c.issuedBy?.fullName ?? null,
      }))}
      students={students.map((s) => ({ id: s.id, name: s.fullName }))}
      completedLevels={completedLevels.map((cl) => ({
        studentId: cl.student.id,
        studentName: cl.student.fullName,
        levelId: cl.level.id,
        levelName: cl.level.name,
        courseId: cl.level.courseId,
      }))}
      courses={courses.map((c) => ({
        id: c.id,
        name: c.name,
        levels: c.levels.map((l) => ({ id: l.id, name: l.name })),
      }))}
    />
  )
}
