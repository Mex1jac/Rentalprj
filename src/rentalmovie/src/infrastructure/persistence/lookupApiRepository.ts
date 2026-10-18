import type { AddressOption, StoreOption } from '../../domain/entities/lookup'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import { mapApiError } from '../http/errorMapper'
import { api } from '../http/httpClient'

/** HTTP adapter for the lookup port (form selects). */
export const lookupApiRepository: LookupRepository = {
  async getAddresses() {
    try {
      return await api.get<AddressOption[]>('/api/lookups/addresses')
    } catch (error) {
      throw mapApiError(error)
    }
  },

  async getStores() {
    try {
      return await api.get<StoreOption[]>('/api/lookups/stores')
    } catch (error) {
      throw mapApiError(error)
    }
  },
}
