import useSWR from 'swr'
import { emptyPage, type PagedResult } from '../../domain/entities/pagedResult'
import type { Film } from '../../domain/entities/film'
import type { FilmListQuery, FilmRepository } from '../../domain/ports/filmRepository'
import { validatePagination } from '../services/paginationService'

/** Prefix shared by every film list key, used for scoped revalidation. */
export const FILM_LIST_KEY_PREFIX = 'film:list:'

/**
 * Stable cache key for a film list query (rule client-swr-dedup): one entry
 * per filter/page combination, so a slow response for an older query can
 * never overwrite the results of a newer one. The key is derived from the
 * query only — transport details (URLs) belong to the repository adapter.
 */
export function filmListKey(query: FilmListQuery): string {
  return `${FILM_LIST_KEY_PREFIX}${JSON.stringify([
    query.search ?? null,
    query.page ?? null,
    query.pageSize ?? null,
  ])}`
}

export interface FilmListResult {
  /** Current page envelope (empty until the first response arrives). */
  films: PagedResult<Film>
  error: unknown
  isLoading: boolean
  /** True while a new page/filter loads; the previous page stays visible. */
  isValidating: boolean
}

/** Read use case: cached, deduplicated, server-paginated list (SWR). */
export function useFilmList(
  repository: FilmRepository,
  query: FilmListQuery,
): FilmListResult {
  const { data, error, isLoading, isValidating } = useSWR(
    filmListKey(query),
    () => {
      validatePagination(query.page ?? 1, query.pageSize)
      return repository.list(query)
    },
    // Keep the previous page visible while the next one loads (no blank flash).
    { keepPreviousData: true },
  )
  return {
    films: data ?? emptyPage<Film>(query.page ?? 1, query.pageSize ?? 0),
    error,
    isLoading,
    isValidating,
  }
}
