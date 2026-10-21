import useSWR from 'swr'
import type { Customer } from '../../domain/entities/customer'
import type { CustomerListQuery, CustomerRepository } from '../../domain/ports/customerRepository'

/** Prefix shared by every customer list key, used for scoped revalidation. */
export const CUSTOMER_LIST_KEY_PREFIX = 'customer:list:'

/**
 * Stable cache key for a customer list query (rule client-swr-dedup): one
 * entry per filter combination, so a slow response for an older query can
 * never overwrite the results of a newer one. The key is derived from the
 * query only — transport details (URLs) belong to the repository adapter.
 */
export function customerListKey(query: CustomerListQuery): string {
  return `${CUSTOMER_LIST_KEY_PREFIX}${JSON.stringify([query.search ?? null, query.active ?? null])}`
}

export interface CustomerListResult {
  customers: Customer[]
  error: unknown
  isLoading: boolean
}

/** Read use case: cached, deduplicated list (SWR). */
export function useCustomerList(
  repository: CustomerRepository,
  query: CustomerListQuery,
): CustomerListResult {
  const { data = [], error, isLoading } = useSWR(customerListKey(query), () => repository.getAll(query))
  return { customers: data, error, isLoading }
}
