import { requireUser } from '@/lib/auth'
import { globalSearch } from '@/server/services/search'
import { SearchResults } from './search-results'

export const metadata = { title: 'Search' }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''

  const results =
    q.length >= 2
      ? await globalSearch(q, user.role === 'TEACHER' ? user.teacher?.id : undefined)
      : null

  return <SearchResults q={q} results={results} />
}
