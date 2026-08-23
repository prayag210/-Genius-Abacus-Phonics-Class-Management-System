/**
 * Seed script for Genius Abacus & Phonics Class Management System.
 *
 * Seeds:
 *  - Settings singleton (institute info, skill list, payment methods)
 *  - 3 courses: Junior Abacus (8 levels), Senior Abacus (6 levels), Phonics (4 levels)
 *  - All 18 levels at the standard per-level fee (read from course default)
 *  - Initial teacher: Jalpa P. Patel (assigned all courses + all levels)
 *  - Admin user + teacher login for Jalpa
 *
 * The seed is idempotent — it is safe to run multiple times.
 *
 * Initial passwords can be controlled with environment variables:
 *   ADMIN_INITIAL_PASSWORD   (default: Admin@123)
 *   TEACHER_INITIAL_PASSWORD (default: Teacher@123)
 * Change both immediately after first login.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_SKILLS = [
  'Number Recognition',
  'Basic Addition',
  'Basic Subtraction',
  'Mental Calculation',
  'Visualization',
  'Multiplication',
  'Division',
  'Speed Calculation',
  'Accuracy',
  'Concentration',
  'Listening',
  'Finger Movement',
  'Flash Cards',
  'Oral Practice',
]

const COURSE_DEFS = [
  {
    name: 'Junior Abacus',
    description: 'Abacus mental arithmetic program for young learners (ages 5-8).',
    levels: 8,
  },
  {
    name: 'Senior Abacus',
    description: 'Abacus mental arithmetic program for older learners (ages 9-14).',
    levels: 6,
  },
  {
    name: 'Phonics',
    description: 'Systematic phonics program covering sounds, blending and reading fluency.',
    levels: 4,
  },
]

const PER_LEVEL_FEE = 4000

async function main() {
  console.log('Seeding Genius Abacus & Phonics Class Management System...')

  // ---------- Settings ----------
  const settings = await prisma.settings.upsert({
    where: { id: 'main' },
    update: {
      // keep existing values on re-seed, but ensure arrays are populated
      skills: { set: DEFAULT_SKILLS },
      paymentMethods: { set: ['Cash', 'UPI', 'Bank Transfer', 'Other'] },
    },
    create: {
      id: 'main',
      instituteName: 'Genius Abacus & Phonics Class',
      phone: null,
      email: null,
      address: null,
      defaultFee: PER_LEVEL_FEE,
      paymentMethods: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
      passingPercentage: 40,
      skills: DEFAULT_SKILLS,
    },
  })
  console.log(`Settings ensured (institute: ${settings.instituteName})`)

  // ---------- Courses + Levels ----------
  for (const def of COURSE_DEFS) {
    const course = await prisma.course.upsert({
      where: { name: def.name },
      update: {
        description: def.description,
      },
      create: {
        name: def.name,
        description: def.description,
        defaultFeePerLevel: PER_LEVEL_FEE,
        isActive: true,
      },
    })

    for (let n = 1; n <= def.levels; n++) {
      await prisma.level.upsert({
        where: {
          courseId_levelNumber: {
            courseId: course.id,
            levelNumber: n,
          },
        },
        update: {
          name: `Level ${n}`,
          fee: course.defaultFeePerLevel,
        },
        create: {
          courseId: course.id,
          levelNumber: n,
          name: `Level ${n}`,
          fee: course.defaultFeePerLevel,
          isActive: true,
        },
      })
    }
    console.log(`Course "${def.name}" ensured with ${def.levels} levels`)
  }

  // ---------- Initial teacher ----------
  const teacher = await prisma.teacher.upsert({
    where: { id: 'initial-jalpa' },
    update: {
      fullName: 'Jalpa P. Patel',
      branch: 'Genius Abacus & Phonics Class — Himatnagar',
      isActive: true,
    },
    create: {
      id: 'initial-jalpa',
      fullName: 'Jalpa P. Patel',
      branch: 'Genius Abacus & Phonics Class — Himatnagar',
      isActive: true,
      // Phone, email, qualification and experience intentionally left empty —
      // to be filled in by the administrator.
    },
  })

  // Assign all courses + all levels to the initial teacher
  const courses = await prisma.course.findMany({
    include: { levels: true },
  })
  for (const course of courses) {
    await prisma.teacherCourse.upsert({
      where: {
        teacherId_courseId: { teacherId: teacher.id, courseId: course.id },
      },
      update: {},
      create: { teacherId: teacher.id, courseId: course.id },
    })
    for (const level of course.levels) {
      await prisma.teacherLevel.upsert({
        where: {
          teacherId_levelId: { teacherId: teacher.id, levelId: level.id },
        },
        update: {},
        create: { teacherId: teacher.id, levelId: level.id },
      })
    }
  }
  console.log(`Teacher "${teacher.fullName}" ensured and assigned all courses/levels`)

  // ---------- Users ----------
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123'
  const teacherPassword = process.env.TEACHER_INITIAL_PASSWORD || 'Teacher@123'

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: null,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('Admin user ensured (username: admin)')

  await prisma.user.upsert({
    where: { username: 'jalpa' },
    update: {
      teacherId: teacher.id,
    },
    create: {
      username: 'jalpa',
      email: null,
      passwordHash: await bcrypt.hash(teacherPassword, 12),
      role: 'TEACHER',
      isActive: true,
      teacherId: teacher.id,
    },
  })
  console.log('Teacher login ensured (username: jalpa)')

  console.log('Seed completed successfully.')
  console.log('IMPORTANT: change the default passwords immediately after first login.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
