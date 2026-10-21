import useSWR from 'swr'
import type { Rental } from '../../domain/entities/rental'
import type { RentalListQuery, RentalRepository } from '../../domain/ports/rentalRepository'

/** Prefix shared by every rental list key, used for scoped revalidation. */
export const RENTAL_LIST_KEY_PREFIX = 'rental:list:'

/**
 * Stable cache key for a rental list query (rule client-swr-dedup): one entry
 * per search/status combination, so a slow response for an older query can
 * never overwrite the results of a newer one. The key is derived from the
 * query only — transport details (URLs) belong to the repository adapter.
 */
export function rentalListKey(query: RentalListQuery): string {
  return `${RENTAL_LIST_KEY_PREFIX}${JSON.stringify([query.search ?? null, query.status])}`
}

export interface RentalListResult {
  rentals: Rental[]
  error: unknown
  isLoading: boolean
}

/** Read use case: cached, deduplicated list (SWR). */
export function useRentalList(repository: RentalRepository, query: RentalListQuery): RentalListResult {
  const { data = [], error, isLoading } = useSWR(rentalListKey(query), () => repository.getAll(query))
  return { rentals: data, error, isLoading }
}
