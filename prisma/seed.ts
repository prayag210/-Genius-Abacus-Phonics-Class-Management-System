/**
 * Seed script for Genius Abacus & Phonics Class Management System.
 *
 * Seeds:
 *  - Settings singleton
 *  - 3 courses: Junior Abacus, Senior Abacus, Phonics
 *  - All 18 levels
 *  - Initial teacher: Jalpa P. Patel
 *  - Admin login
 *  - Teacher login
 *
 * Admin login:
 *   Username: prayag
 *   Password: prayag2011
 *
 * Teacher login:
 *   Username: jalpa
 *   Password: jalpa1985
 *
 * The seed is idempotent and safe to run multiple times.
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
    description:
      'Abacus mental arithmetic program for young learners (ages 5-8).',
    levels: 8,
  },
  {
    name: 'Senior Abacus',
    description:
      'Abacus mental arithmetic program for older learners (ages 9-14).',
    levels: 6,
  },
  {
    name: 'Phonics',
    description:
      'Systematic phonics program covering sounds, blending and reading fluency.',
    levels: 4,
  },
]

const PER_LEVEL_FEE = 4000

async function main() {
  console.log(
    'Seeding Genius Abacus & Phonics Class Management System...'
  )

  // ============================================================
  // SETTINGS
  // ============================================================

  const settings = await prisma.settings.upsert({
    where: {
      id: 'main',
    },

    update: {
      skills: {
        set: DEFAULT_SKILLS,
      },

      paymentMethods: {
        set: [
          'Cash',
          'UPI',
          'Bank Transfer',
          'Other',
        ],
      },
    },

    create: {
      id: 'main',

      instituteName:
        'Genius Abacus & Phonics Class',

      phone: null,
      email: null,
      address: null,

      defaultFee: PER_LEVEL_FEE,

      paymentMethods: [
        'Cash',
        'UPI',
        'Bank Transfer',
        'Other',
      ],

      passingPercentage: 40,

      skills: DEFAULT_SKILLS,
    },
  })

  console.log(
    `Settings ensured (institute: ${settings.instituteName})`
  )

  // ============================================================
  // COURSES + LEVELS
  // ============================================================

  for (const def of COURSE_DEFS) {
    const course = await prisma.course.upsert({
      where: {
        name: def.name,
      },

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

    console.log(
      `Course "${def.name}" ensured with ${def.levels} levels`
    )
  }

  // ============================================================
  // INITIAL TEACHER
  // ============================================================

  const teacher = await prisma.teacher.upsert({
    where: {
      id: 'initial-jalpa',
    },

    update: {
      fullName: 'Jalpa P. Patel',

      branch:
        'Genius Abacus & Phonics Class — Himatnagar',

      isActive: true,
    },

    create: {
      id: 'initial-jalpa',

      fullName: 'Jalpa P. Patel',

      branch:
        'Genius Abacus & Phonics Class — Himatnagar',

      isActive: true,
    },
  })

  console.log(
    `Teacher "${teacher.fullName}" ensured`
  )

  // ============================================================
  // ASSIGN ALL COURSES + LEVELS TO TEACHER
  // ============================================================

  const courses = await prisma.course.findMany({
    include: {
      levels: true,
    },
  })

  for (const course of courses) {
    await prisma.teacherCourse.upsert({
      where: {
        teacherId_courseId: {
          teacherId: teacher.id,

          courseId: course.id,
        },
      },

      update: {},

      create: {
        teacherId: teacher.id,

        courseId: course.id,
      },
    })

    for (const level of course.levels) {
      await prisma.teacherLevel.upsert({
        where: {
          teacherId_levelId: {
            teacherId: teacher.id,

            levelId: level.id,
          },
        },

        update: {},

        create: {
          teacherId: teacher.id,

          levelId: level.id,
        },
      })
    }
  }

  console.log(
    `Teacher "${teacher.fullName}" assigned to all courses and levels`
  )

  // ============================================================
  // LOGIN CREDENTIALS
  // ============================================================

  const ADMIN_USERNAME = 'prayag'
  const ADMIN_PASSWORD = 'prayag2011'

  const TEACHER_USERNAME = 'jalpa'
  const TEACHER_PASSWORD = 'jalpa1985'

  // Hash passwords
  const adminPasswordHash =
    await bcrypt.hash(ADMIN_PASSWORD, 12)

  const teacherPasswordHash =
    await bcrypt.hash(TEACHER_PASSWORD, 12)

  // ============================================================
  // ADMIN USER
  // ============================================================

  await prisma.user.upsert({
    where: {
      username: ADMIN_USERNAME,
    },

    update: {
      passwordHash: adminPasswordHash,

      role: 'ADMIN',

      isActive: true,

      teacherId: null,
    },

    create: {
      username: ADMIN_USERNAME,

      email: null,

      passwordHash: adminPasswordHash,

      role: 'ADMIN',

      isActive: true,

      teacherId: null,
    },
  })

  console.log(
    `Admin user ensured (username: ${ADMIN_USERNAME})`
  )

  // ============================================================
  // TEACHER USER
  // ============================================================

  /*
   * teacherId is unique in the database.
   *
   * Therefore, first find whether a user is already connected
   * to this teacher.
   */

  const existingTeacherUser =
    await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: TEACHER_USERNAME,
          },

          {
            teacherId: teacher.id,
          },
        ],
      },
    })

  if (existingTeacherUser) {
    await prisma.user.update({
      where: {
        id: existingTeacherUser.id,
      },

      data: {
        username: TEACHER_USERNAME,

        passwordHash: teacherPasswordHash,

        role: 'TEACHER',

        isActive: true,

        teacherId: teacher.id,
      },
    })

    console.log(
      `Existing teacher user updated (username: ${TEACHER_USERNAME})`
    )
  } else {
    await prisma.user.create({
      data: {
        username: TEACHER_USERNAME,

        email: null,

        passwordHash: teacherPasswordHash,

        role: 'TEACHER',

        isActive: true,

        teacherId: teacher.id,
      },
    })

    console.log(
      `Teacher user created (username: ${TEACHER_USERNAME})`
    )
  }

  // ============================================================
  // COMPLETION
  // ============================================================

  console.log('')
  console.log('==========================================')
  console.log('SEED COMPLETED SUCCESSFULLY')
  console.log('==========================================')

  console.log(
    `Admin username:   ${ADMIN_USERNAME}`
  )

  console.log(
    `Admin password:   ${ADMIN_PASSWORD}`
  )

  console.log(
    `Teacher username: ${TEACHER_USERNAME}`
  )

  console.log(
    `Teacher password: ${TEACHER_PASSWORD}`
  )

  console.log('==========================================')
}

main()
  .catch((error) => {
    console.error('Seed failed:')
    console.error(error)

    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
