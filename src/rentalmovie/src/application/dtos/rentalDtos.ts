// Application DTOs for the rentals page.

/**
 * Raw values collected by the rental form: ids and days are strings exactly
 * as selected/typed by the operator. Normalization and validation live in the
 * rental service (application layer), never in the UI. The days field may
 * hold the suggestion derived from the selected films when untouched.
 */
export interface RentalFormValues {
  customerId: string
  staffId: string
  storeId: string
  rentalDays: string
  filmIds: string[]
}
