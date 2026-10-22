import type { Customer } from '../../domain/entities/customer'
import type { PagedResult } from '../../domain/entities/pagedResult'
import type { CustomerListQuery, CustomerRepository } from '../../domain/ports/customerRepository'
import { mapApiError } from '../http/errorMapper'
import { api } from '../http/httpClient'

function buildQuery(query: CustomerListQuery): string {
  const params = new URLSearchParams()
  if (query.search) {
    params.set('search', query.search)
  }
  if (query.active !== undefined) {
    params.set('active', String(query.active))
  }
  if (query.page !== undefined) {
    params.set('page', String(query.page))
  }
  if (query.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * HTTP adapter for the customer port: builds the exact URLs consumed by
 * RentalApp.Api and translates transport failures into domain errors.
 */
export const customerApiRepository: CustomerRepository = {
  async list(query) {
    try {
      return await api.get<PagedResult<Customer>>(`/api/customers${buildQuery(query)}`)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async create(data) {
    try {
      return await api.post<Customer>('/api/customers', data)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async update(customerId, data) {
    try {
      return await api.put<Customer>(`/api/customers/${customerId}`, data)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async setActive(customerId, active) {
    try {
      await api.put<{ customerId: number; active: boolean }>(`/api/customers/${customerId}/active`, { active })
    } catch (error) {
      throw mapApiError(error)
    }
  },
}
