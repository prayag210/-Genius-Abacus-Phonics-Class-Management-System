import Link from 'next/link'
import { Search, Users, GraduationCap, UserCog, BookOpen, Layers, LibraryBig, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SearchResults as SearchResultsType } from '@/server/services/search'

export function SearchResults({
  q,
  results,
}: {
  q: string
  results: SearchResultsType | null
}) {
  const sections: {
    key: keyof SearchResultsType
    title: string
    icon: React.ComponentType<{ className?: string }>
    href: (id: string) => string
  }[] = [
    { key: 'students', title: 'Students', icon: GraduationCap, href: (id) => `/students/${id}` },
    { key: 'parents', title: 'Parents', icon: Users, href: (id) => `/parents?q=${encodeURIComponent(id)}` },
    { key: 'teachers', title: 'Teachers', icon: UserCog, href: (id) => `/teachers/${id}` },
    { key: 'courses', title: 'Courses', icon: BookOpen, href: (id) => `/courses` },
    { key: 'levels', title: 'Levels', icon: Layers, href: (id) => `/levels` },
    { key: 'batches', title: 'Batches', icon: LibraryBig, href: (id) => `/batches` },
    { key: 'payments', title: 'Receipts', icon: Receipt, href: (id) => `/payments/${id}/receipt` },
  ]

  const total = results
    ? sections.reduce((s, sec) => s + results[sec.key].length, 0)
    : 0

  return (
    <div>
      <PageHeader
        title={q ? `Search results for “${q}”` : 'Search'}
        description={
          q
            ? `${total} result(s) found across students, parents, teachers, courses, levels, batches and receipts.`
            : 'Use the search bar at the top to find students, parents, teachers, courses, levels, batches and receipts.'
        }
      />

      {!results ? (
        <EmptyState
          icon={Search}
          title="Type a search term"
          description="Search by student name, parent name, phone, teacher name, course, level, batch or receipt number."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Search}
          title={`No results for “${q}”`}
          description="Try a different spelling or a shorter search term."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections
            .filter((sec) => results[sec.key].length > 0)
            .map((sec) => {
              const Icon = sec.icon
              return (
                <Card key={sec.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" /> {sec.title}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({results[sec.key].length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-border">
                      {results[sec.key].map((item) => (
                        <li key={item.id}>
                          <Link
                            href={sec.href(item.id)}
                            className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.label}</p>
                              {item.sub && (
                                <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
