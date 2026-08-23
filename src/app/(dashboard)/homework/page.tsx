import { requireUser } from '@/lib/auth'
import { listHomework, getHomeworkDetail } from '@/server/services/homework'
import { listCourses } from '@/server/services/courses'
import { listBatches } from '@/server/services/batches'
import { HomeworkClient } from './homework-client'

export const metadata = { title: 'Homework' }

export default async function HomeworkPage() {
  const user = await requireUser()
  const isTeacher = user.role === 'TEACHER' && !!user.teacher

  const [homework, courses, batches] = await Promise.all([
    listHomework(isTeacher ? { teacherId: user.teacher!.id } : undefined),
    listCourses(false),
    listBatches(isTeacher ? { teacherId: user.teacher!.id } : undefined),
  ])

  // fetch submissions for each homework
  const details = await Promise.all(homework.map((h) => getHomeworkDetail(h.id)))
  const submissionsByHomework = new Map(
    details.map((d) => [
      d!.id,
      d!.submissions.map((s) => ({
        studentId: s.studentId,
        studentName: s.student.fullName,
        status: s.status,
        remarks: s.remarks,
      })),
    ])
  )

  return (
    <HomeworkClient
      homework={homework.map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        courseName: h.course?.name ?? null,
        levelName: h.level?.name ?? null,
        batchName: h.batch?.name ?? null,
        dueDate: h.dueDate,
        createdByName: h.createdBy?.fullName ?? null,
        submissionCount: h._count.submissions,
        submissions: submissionsByHomework.get(h.id) ?? [],
      }))}
      courses={courses.map((c) => ({
        id: c.id,
        name: c.name,
        levels: c.levels.map((l) => ({ id: l.id, name: l.name })),
      }))}
      batches={batches.map((b) => ({ id: b.id, name: b.name }))}
    />
  )
}
