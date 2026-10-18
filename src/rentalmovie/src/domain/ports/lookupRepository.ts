import type { AddressOption, StoreOption } from '../entities/lookup'

/** Read-only port for the form selects (mirrors ILookupRepository.cs). */
export interface LookupRepository {
  getAddresses(): Promise<AddressOption[]>

  getStores(): Promise<StoreOption[]>
}
