import { useSWRConfig } from 'swr'
import type { Staff } from '../../domain/entities/staff'
import type { StaffFormValues } from '../dtos/staffDtos'
import { STAFF_LIST_KEY_PREFIX } from '../queries/staffQueries'
import type { StaffService } from '../services/staffService'

/**
 * Mutation use cases for the staff maintenance page. Every write that affects
 * the list revalidates all cached staff lists, so the table always shows
 * server truth regardless of the active search/status filter combination.
 */
export function useStaffMutations(service: StaffService) {
  // Scoped mutate (from useSWRConfig) respects the active cache provider, so
  // revalidation always targets the cache this tree is reading from.
  const { mutate } = useSWRConfig()

  function revalidateLists(): Promise<unknown> {
    return mutate((key) => typeof key === 'string' && key.startsWith(STAFF_LIST_KEY_PREFIX))
  }

  return {
    async create(values: StaffFormValues): Promise<Staff> {
      const created = await service.create(values)
      await revalidateLists()
      return created
    },

    async update(staffId: number, values: StaffFormValues): Promise<Staff> {
      const updated = await service.update(staffId, values)
      await revalidateLists()
      return updated
    },

    changePassword(staffId: number, newPassword: string): Promise<void> {
      // The list never exposes passwords, so nothing to revalidate here.
      return service.changePassword(staffId, newPassword)
    },

    async setActive(member: Staff): Promise<void> {
      // Logical leave / reactivation: toggle against the current state.
      await service.setActive(member.staffId, !member.active)
      await revalidateLists()
    },
  }
}
