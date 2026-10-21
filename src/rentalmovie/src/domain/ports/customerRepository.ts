import type { Customer, CustomerData } from '../entities/customer'

/** Filters accepted by the customer list (one cache entry per combination). */
export interface CustomerListQuery {
  search?: string
  active?: boolean
}

/**
 * Persistence port for the customer (member) table
 * (mirrors ICustomerRepository.cs).
 */
export interface CustomerRepository {
  getAll(query: CustomerListQuery): Promise<Customer[]>

  create(data: CustomerData): Promise<Customer>

  update(customerId: number, data: CustomerData): Promise<Customer>

  setActive(customerId: number, active: boolean): Promise<void>
}
