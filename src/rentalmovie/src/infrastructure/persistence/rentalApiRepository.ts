import type { Rental } from '../../domain/entities/rental'
import type { RentalListQuery, RentalRepository } from '../../domain/ports/rentalRepository'
import { mapApiError } from '../http/errorMapper'
import { api } from '../http/httpClient'

function buildQuery(query: RentalListQuery): string {
  const params = new URLSearchParams()
  if (query.search) {
    params.set('search', query.search)
  }
  params.set('status', query.status)
  return `?${params.toString()}`
}

/**
 * HTTP adapter for the rental port: builds the exact URLs consumed by
 * RentalApp.Api and translates transport failures into domain errors.
 */
export const rentalApiRepository: RentalRepository = {
  async getAll(query) {
    try {
      return await api.get<Rental[]>(`/api/rentals${buildQuery(query)}`)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async create(data) {
    try {
      return await api.post<Rental[]>('/api/rentals', data)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async markReturned(rentalId) {
    try {
      return await api.put<Rental>(`/api/rentals/${rentalId}/return`, {})
    } catch (error) {
      throw mapApiError(error)
    }
  },
}
