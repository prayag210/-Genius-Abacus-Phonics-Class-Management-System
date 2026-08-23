import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getStudent, teacherCanAccessStudent } from '@/server/services/students'
import { getLevelLadder } from '@/server/services/enrollments'
import { listFeeRecords, refreshOverdueStatuses } from '@/server/services/fees'
import { listStudentAttendance, getAttendanceStats } from '@/server/services/attendance'
import { listTeacherNotes, studentSkillSummary } from '@/server/services/tests'
import { listCourses } from '@/server/services/courses'
import { teacherOptions } from '@/server/services/teachers'
import { db } from '@/lib/db'
import { StudentDetailClient } from './student-detail-client'

export const metadata = { title: 'Student Details' }

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id } = await params

  const student = await getStudent(id)
  if (!student) notFound()

  // Teachers can only open their own students
  if (user.role === 'TEACHER' && user.teacher) {
    const allowed = await teacherCanAccessStudent(user.teacher.id, id)
    if (!allowed) redirect('/students')
  }

  await refreshOverdueStatuses()

  const [enrollmentLadders, feeRecords, attendance, attendanceStats, notes, skills, courses, teachers, certificates] =
    await Promise.all([
      Promise.all(
        student.enrollments.map(async (e) => ({
          enrollmentId: e.id,
          ladder: await getLevelLadder(e.id),
        }))
      ),
      listFeeRecords({ studentId: id }),
      listStudentAttendance(id, 60),
      getAttendanceStats(id),
      listTeacherNotes(id),
      studentSkillSummary(id),
      listCourses(false),
      teacherOptions(),
      db.certificate.findMany({
        where: { studentId: id },
        orderBy: { issueDate: 'desc' },
        include: { level: { select: { name: true } } },
      }),
    ])

  const ladderByEnrollment = new Map(enrollmentLadders.map((l) => [l.enrollmentId, l.ladder]))

  return (
    <div>
      <Link
        href="/students"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Students
      </Link>

      <StudentDetailClient
        isAdmin={user.role === 'ADMIN'}
        currentTeacherId={user.teacher?.id ?? null}
        student={{
          id: student.id,
          fullName: student.fullName,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          phone: student.phone,
          email: student.email,
          address: student.address,
          admissionDate: student.admissionDate,
          status: student.status,
          notes: student.notes,
          emergencyContactName: student.emergencyContactName,
          emergencyContactPhone: student.emergencyContactPhone,
          parent: student.parent,
        }}
        enrollments={student.enrollments.map((e) => ({
          id: e.id,
          courseId: e.course.id,
          courseName: e.course.name,
          levelId: e.currentLevel?.id ?? null,
          levelName: e.currentLevel?.name ?? null,
          teacherId: e.teacher?.id ?? null,
          teacherName: e.teacher?.fullName ?? null,
          batchId: e.batch?.id ?? null,
          batchName: e.batch?.name ?? null,
          startDate: e.startDate,
          status: e.status,
          ladder: ladderByEnrollment.get(e.id) ?? [],
        }))}
        feeRecords={feeRecords.map((f) => ({
          id: f.id,
          courseName: f.enrollment.course.name,
          levelName: f.level.name,
          totalFee: Number(f.totalFee),
          paidAmount: Number(f.paidAmount),
          dueDate: f.dueDate,
          status: f.status,
        }))}
        attendance={attendance.map((a) => ({
          id: a.id,
          date: a.date,
          status: a.status,
          batchName: a.batch.name,
          remarks: a.remarks,
        }))}
        attendanceStats={attendanceStats}
        notes={notes.map((n) => ({
          id: n.id,
          note: n.note,
          date: n.date,
          teacherName: n.teacher?.fullName ?? '—',
          teacherId: n.teacherId,
        }))}
        skills={skills.map((s) => ({
          skillName: s.skillName,
          rating: s.rating,
          date: s.date,
          count: s.history.length,
        }))}
        certificates={certificates.map((c) => ({
          id: c.id,
          serialNumber: c.serialNumber,
          title: c.title,
          type: c.type,
          issueDate: c.issueDate,
          levelName: c.level?.name ?? null,
        }))}
        courses={courses.map((c) => ({
          id: c.id,
          name: c.name,
          levels: c.levels.map((l) => ({ id: l.id, name: l.name, fee: Number(l.fee) })),
        }))}
        teachers={teachers.map((t) => ({ id: t.id, name: t.fullName }))}
        testResultsCount={student._count.testResults}
      />
    </div>
  )
}
