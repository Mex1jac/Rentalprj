import type { PagedResult } from '../entities/pagedResult'
import type { Film, FilmCreateData, FilmData } from '../entities/film'

/** Filters accepted by the film list (one cache entry per combination). */
export interface FilmListQuery {
  search?: string
  /** 1-based page. Omit page AND pageSize together to get the full list. */
  page?: number
  /** One of PAGE_SIZES; required whenever page > 1. */
  pageSize?: number
}

/**
 * Persistence port for the film (catalog) table
 * (mirrors IFilmRepository.cs).
 */
export interface FilmRepository {
  /** One page of the filtered list (or the full list when page/pageSize are omitted). */
  list(query: FilmListQuery): Promise<PagedResult<Film>>

  create(data: FilmCreateData): Promise<Film>

  update(filmId: number, data: FilmData): Promise<Film>

  delete(filmId: number): Promise<void>
}
