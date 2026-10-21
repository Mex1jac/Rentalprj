// Member of the video club (mirrors Domain/Entities/Customer.cs).

export interface Customer {
  customerId: number
  firstName: string
  lastName: string
  email: string | null
  addressId: number
  address: string
  storeId: number
  store: string
  active: boolean
}

/** Fields required to create or edit a member (no username/password). */
export interface CustomerData {
  firstName: string
  lastName: string
  email: string | null
  addressId: number
  storeId: number
}

/** Display name for tables and messages. */
export function displayName(customer: Customer): string {
  return `${customer.firstName} ${customer.lastName}`
}
