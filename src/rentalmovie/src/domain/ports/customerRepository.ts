import type { PagedResult } from '../entities/pagedResult'
import type { Customer, CustomerData } from '../entities/customer'

/** Filters accepted by the customer list (one cache entry per combination). */
export interface CustomerListQuery {
  search?: string
  active?: boolean
  /** 1-based page. Omit page AND pageSize together to get the full list. */
  page?: number
  /** One of PAGE_SIZES; required whenever page > 1. */
  pageSize?: number
}

/**
 * Persistence port for the customer (member) table
 * (mirrors ICustomerRepository.cs).
 */
export interface CustomerRepository {
  /** One page of the filtered list (or the full list when page/pageSize are omitted). */
  list(query: CustomerListQuery): Promise<PagedResult<Customer>>

  create(data: CustomerData): Promise<Customer>

  update(customerId: number, data: CustomerData): Promise<Customer>

  setActive(customerId: number, active: boolean): Promise<void>
}
