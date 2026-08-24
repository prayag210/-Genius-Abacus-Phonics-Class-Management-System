# Genius Abacus & Phonics — Class Management System

A complete, production-ready management system for the **Genius Abacus & Phonics Class** coaching institute (Himatnagar). Built for daily use by the institute administrator and teachers.

## What it manages

Teachers · Students · Parents · Courses · Levels · Batches · Enrollments · Level Progression · Attendance · Fees (per level) · Payments & Receipts · Tests & Results · Skill Progress · Homework · Certificates · Calendar & Holidays · Expenses · Reports · Notifications · Activity Log · Settings

## Tech stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | Next.js 16 (App Router), React 19, TypeScript   |
| UI        | Tailwind CSS 4, shadcn/ui, Lucide icons, Recharts |
| Backend   | Next.js Route Handlers (API), TypeScript        |
| Database  | PostgreSQL (Render-compatible)                  |
| ORM       | Prisma 6                                        |
| Auth      | Session-based (httpOnly cookies, bcrypt hashes, DB-backed sessions) |
| Validation| Zod (every API input)                           |
| Forms     | React Hook Form                                 |

## Core domain rules

- **Fee is per level.** Each `Level` has its own fee (₹4,000 by default, editable per level by the admin). A `FeeRecord` is created for every (enrollment, level) pair. Nothing is hard-coded — the admin controls all fees from the UI.
- **Level progression never loses history.** When a student moves from Level 2 to Level 3, the Level 2 `StudentLevel` row is marked `COMPLETED` (with completion date, result and teacher) and a new Level 3 row is created. The next level's `FeeRecord` is generated automatically.
- **Payments are immutable history.** Every payment gets a unique receipt number (`RCP-YYYY-NNNNNN`) from a PostgreSQL sequence. Payments can never be edited or deleted.
- **Initial seed data:** 3 courses (Junior Abacus ×8 levels, Senior Abacus ×6 levels, Phonics ×4 levels — 18 levels total, ₹4,000/level) and the initial teacher **Jalpa P. Patel** (branch: Genius Abacus & Phonics Class — Himatnagar) assigned to all courses/levels.

## Roles

| | ADMIN | TEACHER |
|---|---|---|
| Manage teachers, courses, levels, batches, fees, expenses, settings | ✓ | ✗ |
| Manage students & parents | ✓ | ✗ |
| Record payments | ✓ | ✗ (view only, own students) |
| Mark attendance | ✓ | own batches only |
| Enter test results, skill ratings, homework, notes | ✓ | own students only |
| Reports | all | no expense reports |
| Dashboards | full institute stats | personal students/batches/today's classes |

Teachers are automatically scoped to their own students — enforced in every API route, not just hidden in the UI.

## Local setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (or a remote database URL)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql://user:password@localhost:5432/genius_institute
#   AUTH_SECRET=<generate with: openssl rand -hex 32>

# 3. Generate the Prisma client
npx prisma generate

# 4. Create the database schema (development)
npx prisma migrate dev

# 5. Seed initial data (courses, 18 levels, Jalpa P. Patel, admin user)
npx prisma db seed

# 6. Run the development server
npm run dev
```

Open http://localhost:3000 and sign in:

| Account  | Username | Initial password |
| -------- | -------- | ---------------- |
| Admin    | `admin`  | `Admin@123`      |
| Teacher  | `jalpa`  | `Teacher@123`    |

> **Change both passwords immediately after first login** (sidebar → account menu → Change password). Initial passwords can also be customised before seeding with `ADMIN_INITIAL_PASSWORD` / `TEACHER_INITIAL_PASSWORD` env vars.

### Production build

```bash
npm run build
npm run start
```

### Database commands

```bash
npx prisma generate        # regenerate client after schema changes
npx prisma migrate dev     # create/apply migrations (development)
npx prisma migrate deploy  # apply committed migrations (production/CI)
npx prisma db seed         # seed initial data (idempotent)
npx prisma migrate reset   # reset database (destroys data!)
```

## Deploying to Render

The repository includes `render.yaml` (Render Blueprint) and is designed for Render's Node + PostgreSQL services.

### Option A — Blueprint (recommended)

1. Push this repository to GitHub.
2. In Render, click **New → Blueprint** and select the repository.
3. Render creates:
   - **PostgreSQL** `genius-institute-db` (free/basic plan)
   - **Web Service** `genius-institute-web` with build command `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build` and start command `npm run start`
4. `DATABASE_URL` is wired automatically from the database; `AUTH_SECRET` is generated automatically.
5. **Seed initial data (first deploy only).** The build applies migrations but does not create the login accounts. After the first successful deploy, open the web service's **Shell** tab and run:
   ```bash
   npx prisma db seed
   ```
   (Or temporarily uncomment `postDeployCommand: npx prisma db seed` in `render.yaml`, deploy once, then comment it out again.) This creates the courses, 18 levels, teacher **Jalpa P. Patel**, and the `admin` / `jalpa` logins.
6. Open the service URL, sign in with `admin` / `Admin@123`, and **change the password immediately**.

### Option B — Manual setup

1. **Create the database**
   - New → PostgreSQL → choose a name/plan → create.
   - Copy the **Internal Database URL** (starts with `postgresql://`).

2. **Create the Web Service**
   - New → Web Service → connect the GitHub repository.
   - Runtime: **Node**
   - Build command:
     ```bash
     npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
     ```
   - Start command:
     ```bash
     npm run start
     ```
   - Health check path: `/login`

3. **Environment variables** (Environment tab)
   | Key            | Value                                          |
   | -------------- | ---------------------------------------------- |
   | `DATABASE_URL` | the Internal Database URL from step 1          |
   | `AUTH_SECRET`  | long random string (`openssl rand -hex 32`)    |
   | `NODE_ENV`     | `production` (Render sets this automatically)   |

4. **Run migrations** — already part of the build command (`prisma migrate deploy` applies committed migrations).

5. **Seed initial data (first deploy only)**
   - Shell tab: `npx prisma db seed`
   - (Or temporarily uncomment `postDeployCommand: npx prisma db seed` in `render.yaml`.)

6. **Verify** — open the service URL; `/login` should render. Sign in with `admin` / `Admin@123` and **change the password immediately**.

### Database backups (Render)

- Render PostgreSQL managed plans take automatic daily backups (paid plans; check your plan's retention).
- Recommended extra safety: periodic `pg_dump` via the Shell tab:
  ```bash
  pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
  ```
- The admin UI also offers CSV exports (Reports → Export CSV) for students, teachers, courses, levels, payments, attendance and expenses. CSV exports are convenience copies, **not** a substitute for database backups.

## Project structure

```
src/
├── app/
│   ├── (auth)/login/            # login page
│   ├── (dashboard)/             # authenticated app shell
│   │   ├── dashboard/           # admin + teacher dashboards
│   │   ├── students/[id]/       # student detail (tabs: progress, fees,
│   │   │                        #   attendance, skills, notes, overview)
│   │   ├── teachers/[id]/       # teacher detail (assignments, login account)
│   │   ├── parents/ courses/ levels/ batches/ attendance/
│   │   ├── fees/ payments/[id]/receipt/   # printable receipts
│   │   ├── tests/ progress/ homework/ certificates/
│   │   ├── calendar/ reports/ expenses/ notifications/
│   │   ├── settings/            # institute config, skills, users, activity
│   │   ├── password/            # change password
│   │   └── search/              # global search results
│   └── api/                     # REST API (all routes behind auth)
│       ├── auth/                # login, logout, me, change-password
│       ├── teachers/ students/ parents/ courses/ levels/
│       ├── enrollments/[id]/progress/   # level ladder + complete-level
│       ├── batches/[id]/students/ attendance/
│       ├── fees/ payments/ receipts via payments/[id]
│       ├── tests/[id]/results/ progress/ notes/
│       ├── homework/[id]/submissions/
│       ├── calendar/ certificates/ expenses/ notifications/
│       ├── settings/ search/ reports/   # reports doubles as CSV export
│
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── layout/                  # app shell, sidebar, nav config
│   ├── shared/                  # tables, dialogs, badges, payment dialog
│   └── dashboard/               # charts
│
├── lib/
│   ├── auth.ts                  # sessions, bcrypt, login/logout
│   ├── permissions.ts           # role → action matrix
│   ├── api.ts                   # withAuth wrapper, error handling
│   ├── db.ts                    # Prisma client singleton
│   └── validations/             # Zod schemas per domain
│
└── server/services/             # all business logic (no UI imports)

prisma/
├── schema.prisma                # 25+ models
├── migrations/                  # SQL migrations (incl. receipt/serial sequences)
└── seed.ts                      # idempotent seed
```

## Database schema summary

25+ relational models with foreign keys, unique constraints and indexes:

- **Auth**: `User` (role ADMIN/TEACHER, bcrypt hash), `Session` (hashed tokens, expiry)
- **People**: `Teacher`, `Parent` (1→N students), `Student` (status: ACTIVE/INACTIVE/COMPLETED/LEFT)
- **Academics**: `Course` (defaultFeePerLevel), `Level` (per-level fee, unique per course+number), `TeacherCourse`, `TeacherLevel`, `Enrollment` (unique student+course; current level, teacher, batch), `StudentLevel` (immutable progression history)
- **Operations**: `Batch` (+`BatchStudent` with schedule-conflict detection), `Attendance` (unique batch+student+date)
- **Finance**: `FeeRecord` (unique enrollment+level; status auto-computed incl. OVERDUE), `Payment` (unique receipt number from PG sequence, immutable)
- **Assessment**: `Test`, `TestResult` (percentage/pass computed), `SkillRating` (skills editable in settings), `Homework` + `HomeworkSubmission`
- **Misc**: `Certificate` (serial from PG sequence), `CalendarEvent`, `Holiday`, `Expense`, `Notification`, `TeacherNote`, `ParentMeeting`, `ActivityLog`, `Settings`

## Security notes

- Passwords hashed with **bcrypt (12 rounds)** — never plaintext or plain SHA-256.
- Sessions: random 256-bit tokens in httpOnly cookies; only SHA-256 hashes stored server-side; 7-day expiry; logout destroys the session row.
- Every API route goes through `withAuth` (authentication → role/permission check → Zod validation → service call → safe error response).
- Teachers are data-scoped to their own students/batches at the service layer.
- Prisma parameterised queries prevent SQL injection; React escaping prevents XSS.
- IDs from the browser are never trusted — ownership is re-verified server-side.
- `robots: noindex` on all pages; no secrets in the client bundle.

## Secrets & git hygiene

**Never commit `.env` or real secrets.** `.env` is listed in `.gitignore`, but if it was committed before that rule was added it will still be tracked. Check and untrack it:

```bash
git ls-files --error-unmatch .env   # if this prints ".env", it is tracked
git rm --cached .env                # stop tracking (keeps your local file)
git commit -m "chore: stop tracking .env"
```

If a real database password or `AUTH_SECRET` was ever committed, **rotate it** after untracking — rotate the database credentials and regenerate `AUTH_SECRET` (`openssl rand -hex 32`). On Render, `AUTH_SECRET` is generated automatically and `DATABASE_URL` is injected from the managed database, so production never reads a committed `.env`.

Use `.env.example` (committed, no real values) as the template: `cp .env.example .env`.

Some scaffold artifacts may also be tracked from the project's original template (e.g. a local `*.db` file, `bun.lock`, helper scripts). They are gitignored now but, if previously committed, untrack them the same way:

```bash
git rm --cached -r db bun.lock .zscripts 2>/dev/null; git commit -m "chore: remove scaffold artifacts from tracking"
```

## Troubleshooting

### "Drift detected" or `The table 'public.Settings' does not exist`

These are **local development** symptoms of a database whose contents no longer match the committed migration history — typically because `prisma db push` (or a partial/old schema) was used against the local database at some point. The committed migration in `prisma/migrations/` **does** create every table (including `Settings`) plus all enums, indexes, foreign keys and the receipt/certificate PostgreSQL sequences, so a clean deploy is unaffected.

Fix the **local** database (safe — this destroys only local dev data, never production):

```bash
npx prisma migrate reset      # drops & recreates the LOCAL db from migrations, then reseeds
# or, to apply committed migrations without reseeding:
npx prisma migrate deploy
```

Verify the schema and migration state:

```bash
npx prisma validate           # schema is valid
npx prisma migrate status     # migrations are applied, no drift
```

**In production (Render), never run `migrate reset`, `migrate dev`, or `db push`.** The build runs `prisma migrate deploy`, which only applies committed migrations and never drops data. On a fresh Render database this creates the full schema on the first deploy; the app's `getSettings()` also creates the `Settings` row on demand if it is missing, so the app never crashes on an empty settings table.

### Favicon 404

Fixed: `src/app/icon.svg` (the Genius Abacus brand mark) is served via Next.js's App Router icon convention, which injects the `<link rel="icon">` tag automatically. No configuration is needed.

## Known limitations

- Teacher accounts are created/managed from each teacher's profile page (no standalone "user management" CRUD) — by design, to keep teacher↔login 1:1.
- Receipts "Download PDF" uses the browser's print-to-PDF dialog rather than server-side PDF generation.
- No email/SMS integration — notifications are in-app only.
- WhatsApp/phone links are informational fields in Settings.
- Attendance editing overwrites previous marks for the same batch+date (by design — one record per student per day), with the marker recorded.
- The system is optimised for a small-to-medium institute (single branch). Multi-branch support would need schema extensions.
