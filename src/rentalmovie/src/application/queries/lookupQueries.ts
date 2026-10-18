import useSWR from 'swr'
import type { AddressOption, StoreOption } from '../../domain/entities/lookup'
import type { LookupRepository } from '../../domain/ports/lookupRepository'

export const LOOKUP_ADDRESSES_KEY = 'lookup:addresses'
export const LOOKUP_STORES_KEY = 'lookup:stores'

/** Read use case for the address select (cached: addresses are stable). */
export function useAddresses(repository: LookupRepository): AddressOption[] {
  const { data = [] } = useSWR(LOOKUP_ADDRESSES_KEY, () => repository.getAddresses())
  return data
}

/** Read use case for the store select (cached: stores are stable). */
export function useStores(repository: LookupRepository): StoreOption[] {
  const { data = [] } = useSWR(LOOKUP_STORES_KEY, () => repository.getStores())
  return data
}
