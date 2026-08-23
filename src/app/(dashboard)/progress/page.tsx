import { requireUser } from '@/lib/auth'
import { listSkillRatings, studentSkillSummary } from '@/server/services/tests'
import { db } from '@/lib/db'
import { ProgressClient } from './progress-client'

export const metadata = { title: 'Progress' }

export default async function ProgressPage() {
  const user = await requireUser()
  const isTeacher = user.role === 'TEACHER' && !!user.teacher
  const teacherId = isTeacher ? user.teacher!.id : undefined

  const ratings = await listSkillRatings({ teacherId })

  // Teachers see only their students' ratings
  let filtered = ratings
  if (isTeacher) {
    const myEnrollments = await db.enrollment.findMany({
      where: { teacherId },
      select: { studentId: true },
    })
    const myStudentIds = new Set(myEnrollments.map((e) => e.studentId))
    filtered = ratings.filter((r) => myStudentIds.has(r.studentId))
  }

  const skills = await db.settings.findUnique({
    where: { id: 'main' },
    select: { skills: true },
  })

  return (
    <ProgressClient
      userRole={user.role}
      ratings={filtered.map((r) => ({
        id: r.id,
        studentId: r.student.id,
        studentName: r.student.fullName,
        skillName: r.skillName,
        rating: r.rating,
        notes: r.notes,
        date: r.date,
        ratedBy: r.ratedBy?.fullName ?? null,
      }))}
      availableSkills={skills?.skills ?? []}
    />
  )
}
