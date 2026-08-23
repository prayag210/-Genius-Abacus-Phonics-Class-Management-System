'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronsUpDown,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { navSectionsFor, type NavSection } from './nav-config'
import type { Role } from '@prisma/client'

export type ShellUser = {
  id: string
  username: string
  role: Role
  teacherName: string | null
}

function NavLinks({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-5 px-3 py-4">
      {sections.map((section) => (
        <div key={section.label} className="space-y-1">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {section.label}
          </p>
          {section.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors min-h-11 lg:min-h-0',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function BrandMark({ instituteName, asSheetTitle = false }: { instituteName: string; asSheetTitle?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-primary flex items-center justify-center">
        <GraduationCap className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        {asSheetTitle ? (
          <SheetTitle className="truncate text-sm font-semibold text-sidebar-foreground">
            {instituteName}
          </SheetTitle>
        ) : (
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{instituteName}</p>
        )}
        <p className="text-[11px] text-sidebar-foreground/60">Class Management</p>
      </div>
    </div>
  )
}

export function AppShell({
  user,
  instituteName,
  children,
}: {
  user: ShellUser
  instituteName: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const sections = useMemo(() => navSectionsFor(user.role), [user.role])

  const displayName = user.teacherName ?? user.username

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        <BrandMark instituteName={instituteName} />
        <div className="flex-1 overflow-y-auto">
          <NavLinks sections={sections} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent min-h-11"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {displayName}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60">
                    <ShieldCheck className="h-3 w-3" />
                    {user.role === 'ADMIN' ? 'Administrator' : 'Teacher'}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/password">Change password</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          {/* Mobile nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <BrandMark instituteName={instituteName} asSheetTitle />
              <div className="max-h-[calc(100vh-5rem)] overflow-y-auto">
                <NavLinks sections={sections} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-sidebar-border p-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent min-h-11"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Global search */}
          <form onSubmit={submitSearch} className="flex-1 max-w-md" role="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students, parents, teachers, courses…"
                className="pl-9 h-9"
                aria-label="Global search"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {user.role === 'ADMIN' ? 'Admin' : 'Teacher'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
