import { api } from './api'
import type { Staff, StaffCreateInput, StaffUpdateInput } from './types'

function buildQuery(params: { search?: string; active?: boolean | undefined }): string {
  const query = new URLSearchParams()
  if (params.search) {
    query.set('search', params.search)
  }
  if (params.active !== undefined) {
    query.set('active', String(params.active))
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

/**
 * SWR cache keys. List keys embed the filters so each filter combination has
 * its own cache entry (no stale responses can overwrite a newer query).
 */
export const staffKeys = {
  list: (search?: string, active?: boolean) => `/api/staff${buildQuery({ search, active })}`,
  addresses: '/api/lookups/addresses',
  stores: '/api/lookups/stores',
}

export const staffApi = {
  create(input: StaffCreateInput) {
    return api.post<Staff>('/api/staff', input)
  },

  update(staffId: number, input: StaffUpdateInput) {
    return api.put<Staff>(`/api/staff/${staffId}`, input)
  },

  changePassword(staffId: number, newPassword: string) {
    return api.put<void>(`/api/staff/${staffId}/password`, { newPassword })
  },

  setActive(staffId: number, active: boolean) {
    return api.put<{ staffId: number; active: boolean }>(`/api/staff/${staffId}/active`, { active })
  },
}
