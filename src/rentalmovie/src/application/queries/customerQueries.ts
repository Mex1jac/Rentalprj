import useSWR from 'swr'
import { emptyPage, type PagedResult } from '../../domain/entities/pagedResult'
import type { Customer } from '../../domain/entities/customer'
import type { CustomerListQuery, CustomerRepository } from '../../domain/ports/customerRepository'
import { validatePagination } from '../services/paginationService'

/** Prefix shared by every customer list key, used for scoped revalidation. */
export const CUSTOMER_LIST_KEY_PREFIX = 'customer:list:'

/**
 * Stable cache key for a customer list query (rule client-swr-dedup): one
 * entry per filter/page combination, so a slow response for an older query
 * can never overwrite the results of a newer one. The key is derived from the
 * query only — transport details (URLs) belong to the repository adapter.
 */
export function customerListKey(query: CustomerListQuery): string {
  return `${CUSTOMER_LIST_KEY_PREFIX}${JSON.stringify([
    query.search ?? null,
    query.active ?? null,
    query.page ?? null,
    query.pageSize ?? null,
  ])}`
}

export interface CustomerListResult {
  /** Current page envelope (empty until the first response arrives). */
  customers: PagedResult<Customer>
  error: unknown
  isLoading: boolean
  /** True while a new page/filter loads; the previous page stays visible. */
  isValidating: boolean
}

/** Read use case: cached, deduplicated, server-paginated list (SWR). */
export function useCustomerList(
  repository: CustomerRepository,
  query: CustomerListQuery,
): CustomerListResult {
  const { data, error, isLoading, isValidating } = useSWR(
    customerListKey(query),
    () => {
      validatePagination(query.page ?? 1, query.pageSize)
      return repository.list(query)
    },
    // Keep the previous page visible while the next one loads (no blank flash).
    { keepPreviousData: true },
  )
  return {
    customers: data ?? emptyPage<Customer>(query.page ?? 1, query.pageSize ?? 0),
    error,
    isLoading,
    isValidating,
  }
}
