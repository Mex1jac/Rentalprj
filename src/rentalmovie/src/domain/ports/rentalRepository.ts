import type { PagedResult } from '../entities/pagedResult'
import type { Rental, RentalCreateData, RentalStatus } from '../entities/rental'

/** Filters accepted by the rental list (one cache entry per combination). */
export interface RentalListQuery {
  search?: string
  status: RentalStatus
  /** 1-based page. Omit page AND pageSize together to get the full list. */
  page?: number
  /** One of PAGE_SIZES; required whenever page > 1. */
  pageSize?: number
}

/**
 * Persistence port for the rental table (mirrors IRentalRepository.cs).
 * `create` rents one physical copy per requested film in a single batch.
 */
export interface RentalRepository {
  /** One page of the filtered list (or the capped full list when page/pageSize are omitted). */
  list(query: RentalListQuery): Promise<PagedResult<Rental>>

  create(data: RentalCreateData): Promise<Rental[]>

  /** Registers the return of an open rental; fails on a double return. */
  markReturned(rentalId: number): Promise<Rental>
}
