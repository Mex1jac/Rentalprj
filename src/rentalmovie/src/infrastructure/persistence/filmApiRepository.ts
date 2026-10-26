import type { Film } from '../../domain/entities/film'
import type { PagedResult } from '../../domain/entities/pagedResult'
import type { FilmListQuery, FilmRepository } from '../../domain/ports/filmRepository'
import { mapApiError } from '../http/errorMapper'
import { api } from '../http/httpClient'

function buildQuery(query: FilmListQuery): string {
  const params = new URLSearchParams()
  if (query.search) {
    params.set('search', query.search)
  }
  // 'all' is the server default: skip the param to keep URLs canonical.
  if (query.status && query.status !== 'all') {
    params.set('status', query.status)
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
 * HTTP adapter for the film port: builds the exact URLs consumed by
 * RentalApp.Api and translates transport failures into domain errors.
 */
export const filmApiRepository: FilmRepository = {
  async list(query) {
    try {
      return await api.get<PagedResult<Film>>(`/api/films${buildQuery(query)}`)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async create(data) {
    try {
      return await api.post<Film>('/api/films', data)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async update(filmId, data) {
    try {
      return await api.put<Film>(`/api/films/${filmId}`, data)
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async setActive(filmId, active) {
    try {
      await api.put<{ filmId: number; active: boolean }>(`/api/films/${filmId}/active`, { active })
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async delete(filmId) {
    try {
      await api.del<void>(`/api/films/${filmId}`)
    } catch (error) {
      throw mapApiError(error)
    }
  },
}
