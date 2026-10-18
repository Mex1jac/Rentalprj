// Staff member of the video club (mirrors Domain/Entities/Staff.cs). The
// password is intentionally not part of this entity: it is a write-only value
// passed straight to the repository so it can never be read back (FR-1).

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

/** Fields required to create a staff member (the password travels separately). */
export interface CreateStaffData {
  firstName: string
  lastName: string
  email: string | null
  addressId: number
  storeId: number
  username: string
}

/** Fields editable on an existing staff member (password has its own use case). */
export interface UpdateStaffData {
  firstName: string
  lastName: string
  email: string | null
  addressId: number
  storeId: number
  username: string
}

/** Display name for tables and messages. */
export function displayName(member: Staff): string {
  return `${member.firstName} ${member.lastName}`
}
