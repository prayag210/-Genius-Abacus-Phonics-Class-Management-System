import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  Layers,
  LibraryBig,
  PencilLine,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  FileCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@prisma/client'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  roles: Role[]
}

export type NavSection = {
  label: string
  items: NavItem[]
}

const ALL: Role[] = ['ADMIN', 'TEACHER']

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    label: 'People',
    items: [
      { title: 'Students', href: '/students', icon: GraduationCap, roles: ALL },
      { title: 'Parents', href: '/parents', icon: Users, roles: ALL },
      { title: 'Teachers', href: '/teachers', icon: UserCog, roles: ALL },
    ],
  },
  {
    label: 'Academics',
    items: [
      { title: 'Courses', href: '/courses', icon: BookOpen, roles: ALL },
      { title: 'Levels', href: '/levels', icon: Layers, roles: ALL },
      { title: 'Batches', href: '/batches', icon: LibraryBig, roles: ALL },
      { title: 'Tests', href: '/tests', icon: FileCheck, roles: ALL },
      { title: 'Progress', href: '/progress', icon: TrendingUp, roles: ALL },
      { title: 'Homework', href: '/homework', icon: PencilLine, roles: ALL },
      { title: 'Certificates', href: '/certificates', icon: Award, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Attendance', href: '/attendance', icon: ClipboardCheck, roles: ALL },
      { title: 'Fees', href: '/fees', icon: IndianRupee, roles: ALL },
      { title: 'Payments', href: '/payments', icon: CreditCard, roles: ALL },
      { title: 'Expenses', href: '/expenses', icon: Wallet, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { title: 'Calendar', href: '/calendar', icon: CalendarDays, roles: ALL },
      { title: 'Reports', href: '/reports', icon: BarChart3, roles: ALL },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Notifications', href: '/notifications', icon: Bell, roles: ALL },
      { title: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
]

export function navSectionsFor(role: Role): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0)
}
