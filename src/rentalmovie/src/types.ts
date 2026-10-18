// Types shared with the RentalApp.Api DTOs.

export interface Staff {
  staffId: number
  firstName: string
  lastName: string
  email: string | null
  addressId: number
  address: string
  storeId: number
  store: string
  active: boolean
  username: string
}

export interface StaffCreateInput {
  firstName: string
  lastName: string
  email: string | null
  addressId: number
  storeId: number
  username: string
  password: string
}

export interface StaffUpdateInput {
  firstName: string
  lastName: string
  email: string | null
  addressId: number
  storeId: number
  username: string
}

export interface AddressOption {
  addressId: number
  display: string
}

export interface StoreOption {
  storeId: number
  display: string
}
