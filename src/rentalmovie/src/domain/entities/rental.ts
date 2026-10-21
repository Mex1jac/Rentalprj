// One rented copy (mirrors Domain/Entities/Rental.cs). JSON datetimes arrive
// as ISO strings; the UI formats them at display time.

export interface Rental {
  rentalId: number
  rentalDate: string
  dueDate: string
  returnDate: string | null
  /** Open and past its due date (computed server-side). */
  overdue: boolean
  customerId: number
  customer: string
  storeId: number
  store: string
  staff: string
  filmId: number
  filmTitle: string
  inventoryId: number
}

/** Filters accepted by the rental list (one cache entry per combination). */
export type RentalStatus = 'open' | 'returned' | 'all'

/** Fields required to rent 1+ films (ids arrive as strings from the form). */
export interface RentalCreateData {
  customerId: number
  staffId: number
  storeId: number
  rentalDays: number
  filmIds: number[]
}

/** An open rental has not been returned yet. */
export function isOpen(rental: Rental): boolean {
  return rental.returnDate === null
}
