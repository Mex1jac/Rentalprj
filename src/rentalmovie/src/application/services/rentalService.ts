import { ValidationError } from '../../domain/errors/domainErrors'
import type { Rental, RentalCreateData } from '../../domain/entities/rental'
import type { RentalRepository } from '../../domain/ports/rentalRepository'
import type { RentalFormValues } from '../dtos/rentalDtos'

const MAX_RENTAL_DAYS = 90
const MAX_FILMS_PER_RENTAL = 50

/**
 * Normalizes raw form values into domain data and mirrors the backend
 * validations (Application/Services/RentalService.cs) so invalid input fails
 * fast with exactly the wording the API would return.
 */
export function normalizeRentalForm(values: RentalFormValues): RentalCreateData {
  const data: RentalCreateData = {
    customerId: Number(values.customerId),
    staffId: Number(values.staffId),
    storeId: Number(values.storeId),
    rentalDays: Number(values.rentalDays),
    filmIds: values.filmIds.map((filmId) => Number(filmId)),
  }

  if (!Number.isInteger(data.customerId) || data.customerId <= 0) {
    throw new ValidationError('A customer must be selected.')
  }
  if (!Number.isInteger(data.staffId) || data.staffId <= 0) {
    throw new ValidationError('A staff member must be selected.')
  }
  if (!Number.isInteger(data.storeId) || data.storeId <= 0) {
    throw new ValidationError('A store must be selected.')
  }
  if (!Number.isInteger(data.rentalDays) || data.rentalDays < 1 || data.rentalDays > MAX_RENTAL_DAYS) {
    throw new ValidationError(`Rental days must be between 1 and ${MAX_RENTAL_DAYS}.`)
  }
  if (data.filmIds.length === 0) {
    throw new ValidationError('At least one film must be selected.')
  }
  if (data.filmIds.length > MAX_FILMS_PER_RENTAL) {
    throw new ValidationError(`A rental can include at most ${MAX_FILMS_PER_RENTAL} films.`)
  }
  if (data.filmIds.some((filmId) => !Number.isInteger(filmId) || filmId <= 0)) {
    throw new ValidationError('At least one film must be selected.')
  }

  return data
}

/** Use cases for the rentals page (mirrors RentalService.cs). */
export interface RentalService {
  /** Rents one physical copy of each selected film for the captured days. */
  create(values: RentalFormValues): Promise<Rental[]>

  /** Registers the return of an open rental. */
  returnRental(rentalId: number): Promise<Rental>
}

/**
 * Service factory over the persistence port: the application layer depends
 * only on the domain contract, the concrete adapter is injected at the
 * composition root (presentation/App.tsx).
 */
export function createRentalService(repository: RentalRepository): RentalService {
  return {
    // async methods: validation failures always surface as rejected promises,
    // never as synchronous throws, so callers can uniformly `await` them.
    async create(values) {
      return repository.create(normalizeRentalForm(values))
    },

    async returnRental(rentalId) {
      return repository.markReturned(rentalId)
    },
  }
}
