import type { CreateStaffData, Staff, UpdateStaffData } from '../entities/staff'

/** Filters accepted by the staff list (one cache entry per combination). */
export interface StaffListQuery {
  search?: string
  active?: boolean
}

/**
 * Persistence port for the staff table (mirrors IStaffRepository.cs).
 * Passwords are write-only values: they are received as plain strings and
 * never read back (requirement FR-1).
 */
export interface StaffRepository {
  getAll(query: StaffListQuery): Promise<Staff[]>

  create(data: CreateStaffData, password: string): Promise<Staff>

  update(staffId: number, data: UpdateStaffData): Promise<Staff>

  changePassword(staffId: number, newPassword: string): Promise<void>

  setActive(staffId: number, active: boolean): Promise<void>
}
