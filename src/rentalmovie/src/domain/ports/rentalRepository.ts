import type { Rental, RentalCreateData, RentalStatus } from '../entities/rental'

/** Filters accepted by the rental list (one cache entry per combination). */
export interface RentalListQuery {
  search?: string
  status: RentalStatus
}

/**
 * Persistence port for the rental table (mirrors IRentalRepository.cs).
 * `create` rents one physical copy per requested film in a single batch.
 */
export interface RentalRepository {
  getAll(query: RentalListQuery): Promise<Rental[]>

  create(data: RentalCreateData): Promise<Rental[]>

  /** Registers the return of an open rental; fails on a double return. */
  markReturned(rentalId: number): Promise<Rental>
}
