import useSWR from 'swr'
import type { AddressOption, FilmOption, StoreOption } from '../../domain/entities/lookup'
import type { LookupRepository } from '../../domain/ports/lookupRepository'

export const LOOKUP_ADDRESSES_KEY = 'lookup:addresses'
export const LOOKUP_STORES_KEY = 'lookup:stores'

/** Prefix shared by every film lookup key, used for scoped revalidation. */
export const LOOKUP_FILMS_KEY_PREFIX = 'lookup:films:'

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

export interface FilmsResult {
  films: FilmOption[]
  isLoading: boolean
}

/**
 * Read use case for the rental form film list. The key includes the store:
 * availability is per store, and no request runs until a store is picked
 * (null key disables the hook).
 */
export function useFilms(repository: LookupRepository, storeId: string): FilmsResult {
  const key = storeId === '' ? null : `${LOOKUP_FILMS_KEY_PREFIX}${storeId}`
  const { data = [], isLoading } = useSWR(key, () => repository.getFilms(Number(storeId)))
  return { films: data, isLoading }
}
