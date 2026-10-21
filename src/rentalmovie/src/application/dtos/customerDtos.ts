// Application DTOs for the members (customers) page.

/**
 * Raw values collected by the customer form: every field is a string exactly
 * as typed by the operator. Normalization and validation live in the customer
 * service (application layer), never in the UI.
 */
export interface CustomerFormValues {
  firstName: string
  lastName: string
  email: string
  addressId: string
  storeId: string
}
