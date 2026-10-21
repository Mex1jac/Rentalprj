import type { AddressOption, FilmOption, StoreOption } from '../entities/lookup'

/** Read-only port for the form selects (mirrors ILookupRepository.cs). */
export interface LookupRepository {
  getAddresses(): Promise<AddressOption[]>

  getStores(): Promise<StoreOption[]>

  /** Films stocked at a store with their available copies (rental form). */
  getFilms(storeId: number): Promise<FilmOption[]>
}
