// Lookup entities used by the staff form selects (mirror
// Domain/Entities/AddressOption.cs and StoreOption.cs).

export interface AddressOption {
  addressId: number
  display: string
}

export interface StoreOption {
  storeId: number
  display: string
}

/** Film stocked at a store with its currently available copies. */
export interface FilmOption {
  filmId: number
  title: string
  rentalDurationDays: number
  rentalRate: number
  availableCopies: number
}

/** Language of the film catalog (film form selects). */
export interface LanguageOption {
  languageId: number
  name: string
}
