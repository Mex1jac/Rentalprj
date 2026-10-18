import type { Staff } from '../../domain/entities/staff'
import type { StaffListQuery, StaffRepository } from '../../domain/ports/staffRepository'
import { mapApiError } from '../http/errorMapper'
import { api } from '../http/httpClient'

function buildQuery(query: StaffListQuery): string {
  const params = new URLSearchParams()
  if (query.search) {
    params.set('search', query.search)
  }
  if (query.active !== undefined) {
    params.set('active', String(query.active))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * HTTP adapter for the staff port: builds the exact URLs consumed by
 * RentalApp.Api and translates transport failures into domain errors.
 */
export const staffApiRepository: StaffRepository = {
  async getAll(query) {
    try {
      return await api.get<Staff[]>(`/api/staff${buildQuery(query)}`)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async create(data, password) {
    try {
      // The clear password travels only here, in the create body (FR-1: it is
      // hashed server-side and never returned).
      return await api.post<Staff>('/api/staff', { ...data, password })
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async update(staffId, data) {
    try {
      return await api.put<Staff>(`/api/staff/${staffId}`, data)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async changePassword(staffId, newPassword) {
    try {
      await api.put<void>(`/api/staff/${staffId}/password`, { newPassword })
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async setActive(staffId, active) {
    try {
      await api.put<{ staffId: number; active: boolean }>(`/api/staff/${staffId}/active`, { active })
    } catch (error) {
      throw mapApiError(error)
    }
  },
}
