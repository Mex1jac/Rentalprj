import { useSWRConfig } from 'swr'
import type { Customer } from '../../domain/entities/customer'
import type { CustomerFormValues } from '../dtos/customerDtos'
import { CUSTOMER_LIST_KEY_PREFIX } from '../queries/customerQueries'
import { RENTAL_LIST_KEY_PREFIX } from '../queries/rentalQueries'
import type { CustomerService } from '../services/customerService'

/**
 * Mutation use cases for the members page. Every write revalidates all cached
 * customer lists and the rental lists (the member's name is displayed on
 * rental rows), so the UI always shows server truth.
 */
export function useCustomerMutations(service: CustomerService) {
  // Scoped mutate (from useSWRConfig) respects the active cache provider, so
  // revalidation always targets the cache this tree is reading from.
  const { mutate } = useSWRConfig()

  function revalidateLists(): Promise<unknown> {
    return mutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith(CUSTOMER_LIST_KEY_PREFIX) || key.startsWith(RENTAL_LIST_KEY_PREFIX)),
    )
  }

  return {
    async create(values: CustomerFormValues): Promise<Customer> {
      const created = await service.create(values)
      await revalidateLists()
      return created
    },

    async update(customerId: number, values: CustomerFormValues): Promise<Customer> {
      const updated = await service.update(customerId, values)
      await revalidateLists()
      return updated
    },

    async setActive(member: Customer): Promise<void> {
      // Logical leave / reactivation: toggle against the current state.
      await service.setActive(member.customerId, !member.active)
      await revalidateLists()
    },
  }
}
