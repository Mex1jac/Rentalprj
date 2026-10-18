// Application DTOs for the staff maintenance page.

/**
 * Raw values collected by the staff form: every field is a string exactly as
 * typed by the operator. Normalization and validation live in the staff
 * service (application layer), never in the UI.
 */
export interface StaffFormValues {
  firstName: string
  lastName: string
  email: string
  addressId: string
  storeId: string
  username: string
  password: string
}
