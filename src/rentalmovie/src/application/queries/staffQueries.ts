import useSWR from 'swr'
import type { Staff } from '../../domain/entities/staff'
import type { StaffListQuery, StaffRepository } from '../../domain/ports/staffRepository'

/** Prefix shared by every staff list key, used for scoped revalidation. */
export const STAFF_LIST_KEY_PREFIX = 'staff:list:'

/**
 * Stable cache key for a staff list query (rule client-swr-dedup): one entry
 * per filter combination, so a slow response for an older query can never
 * overwrite the results of a newer one. The key is derived from the query
 * only — transport details (URLs) belong to the repository adapter.
 */
export function staffListKey(query: StaffListQuery): string {
  return `${STAFF_LIST_KEY_PREFIX}${JSON.stringify([query.search ?? null, query.active ?? null])}`
}

export interface StaffListResult {
  staff: Staff[]
  error: unknown
  isLoading: boolean
}

/** Read use case: cached, deduplicated list (SWR). */
export function useStaffList(repository: StaffRepository, query: StaffListQuery): StaffListResult {
  const { data = [], error, isLoading } = useSWR(staffListKey(query), () => repository.getAll(query))
  return { staff: data, error, isLoading }
}
