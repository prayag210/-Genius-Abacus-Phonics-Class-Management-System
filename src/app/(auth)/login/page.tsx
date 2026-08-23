import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { LoginForm } from './login-form'

export const metadata = { title: 'Sign In' }

async function getInstituteName(): Promise<string> {
  try {
    const settings = await db.settings.findUnique({ where: { id: 'main' } })
    return settings?.instituteName ?? 'Genius Abacus & Phonics Class'
  } catch {
    return 'Genius Abacus & Phonics Class'
  }
}

export default async function LoginPage() {
  const user = await getSessionUser()
  if (user) redirect('/dashboard')

  const instituteName = await getInstituteName()

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-sidebar p-10 text-sidebar-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, white 2px, transparent 2px), radial-gradient(circle at 70% 60%, white 2px, transparent 2px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/90 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-primary-foreground" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8v8M12 8v8M17 8v8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-lg leading-tight">{instituteName}</p>
              <p className="text-sm text-sidebar-foreground/70">Class Management System</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-3xl font-bold leading-tight max-w-md">
            Everything your coaching institute needs, in one place.
          </h1>
          <ul className="space-y-3 text-sm text-sidebar-foreground/85 max-w-md">
            {[
              'Students, parents, teachers and enrollments',
              'Level-by-level fee tracking and payment receipts',
              'Batches, attendance and homework management',
              'Tests, skill progress and institute reports',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3 text-sidebar-primary">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} {instituteName}. All rights reserved.
        </p>
      </div>

      {/* Login form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <LoginForm instituteName={instituteName} />
      </div>
    </div>
  )
}
