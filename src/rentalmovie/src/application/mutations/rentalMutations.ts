import { useSWRConfig } from 'swr'
import type { Rental } from '../../domain/entities/rental'
import type { RentalFormValues } from '../dtos/rentalDtos'
import { LOOKUP_FILMS_KEY_PREFIX } from '../queries/lookupQueries'
import { RENTAL_LIST_KEY_PREFIX } from '../queries/rentalQueries'
import type { RentalService } from '../services/rentalService'

/**
 * Mutation use cases for the rentals page. Every write revalidates all cached
 * rental lists (tracking rows) and the film lookups (available copies change
 * with every rental and return).
 */
export function useRentalMutations(service: RentalService) {
  // Scoped mutate (from useSWRConfig) respects the active cache provider, so
  // revalidation always targets the cache this tree is reading from.
  const { mutate } = useSWRConfig()

  function revalidateLists(): Promise<unknown> {
    return mutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith(RENTAL_LIST_KEY_PREFIX) || key.startsWith(LOOKUP_FILMS_KEY_PREFIX)),
    )
  }

  return {
    async create(values: RentalFormValues): Promise<Rental[]> {
      const created = await service.create(values)
      await revalidateLists()
      return created
    },

    async returnRental(rentalId: number): Promise<Rental> {
      const returned = await service.returnRental(rentalId)
      await revalidateLists()
      return returned
    },
  }
}
