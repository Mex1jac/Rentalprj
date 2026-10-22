import useSWR from 'swr'
import { emptyPage, type PagedResult } from '../../domain/entities/pagedResult'
import type { Rental } from '../../domain/entities/rental'
import type { RentalListQuery, RentalRepository } from '../../domain/ports/rentalRepository'
import { validatePagination } from '../services/paginationService'

/** Prefix shared by every rental list key, used for scoped revalidation. */
export const RENTAL_LIST_KEY_PREFIX = 'rental:list:'

/**
 * Stable cache key for a rental list query (rule client-swr-dedup): one entry
 * per search/status/page combination, so a slow response for an older query
 * can never overwrite the results of a newer one. The key is derived from the
 * query only — transport details (URLs) belong to the repository adapter.
 */
export function rentalListKey(query: RentalListQuery): string {
  return `${RENTAL_LIST_KEY_PREFIX}${JSON.stringify([
    query.search ?? null,
    query.status,
    query.page ?? null,
    query.pageSize ?? null,
  ])}`
}

export interface RentalListResult {
  /** Current page envelope (empty until the first response arrives). */
  rentals: PagedResult<Rental>
  error: unknown
  isLoading: boolean
  /** True while a new page/filter loads; the previous page stays visible. */
  isValidating: boolean
}

/** Read use case: cached, deduplicated, server-paginated list (SWR). */
export function useRentalList(
  repository: RentalRepository,
  query: RentalListQuery,
): RentalListResult {
  const { data, error, isLoading, isValidating } = useSWR(
    rentalListKey(query),
    () => {
      validatePagination(query.page ?? 1, query.pageSize)
      return repository.list(query)
    },
    // Keep the previous page visible while the next one loads (no blank flash).
    { keepPreviousData: true },
  )
  return {
    rentals: data ?? emptyPage<Rental>(query.page ?? 1, query.pageSize ?? 0),
    error,
    isLoading,
    isValidating,
  }
}
