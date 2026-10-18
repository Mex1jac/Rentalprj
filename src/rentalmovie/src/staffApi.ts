import { api } from './api'
import type {
  AddressOption,
  Staff,
  StaffCreateInput,
  StaffUpdateInput,
  StoreOption,
} from './types'

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

export const staffApi = {
  list(search?: string, active?: boolean) {
    return api.get<Staff[]>(`/api/staff${buildQuery({ search, active })}`)
  },

  get(staffId: number) {
    return api.get<Staff>(`/api/staff/${staffId}`)
  },

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

export const lookupApi = {
  addresses() {
    return api.get<AddressOption[]>('/api/lookups/addresses')
  },

  stores() {
    return api.get<StoreOption[]>('/api/lookups/stores')
  },
}
