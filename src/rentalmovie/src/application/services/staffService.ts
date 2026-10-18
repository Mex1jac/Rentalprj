import { ValidationError } from '../../domain/errors/domainErrors'
import type { CreateStaffData, Staff } from '../../domain/entities/staff'
import type { StaffRepository } from '../../domain/ports/staffRepository'
import type { StaffFormValues } from '../dtos/staffDtos'

const MIN_PASSWORD_LENGTH = 6

/**
 * Normalizes raw form values into domain data and mirrors the backend
 * validations (Application/Services/StaffService.cs) so invalid input fails
 * fast with exactly the wording the API would return.
 */
export function normalizeStaffForm(values: StaffFormValues): CreateStaffData {
  const data: CreateStaffData = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim() === '' ? null : values.email.trim(),
    addressId: Number(values.addressId),
    storeId: Number(values.storeId),
    username: values.username.trim(),
  }

  if (data.firstName === '' || data.firstName.length > 45) {
    throw new ValidationError('First name is required and cannot exceed 45 characters.')
  }
  if (data.lastName === '' || data.lastName.length > 45) {
    throw new ValidationError('Last name is required and cannot exceed 45 characters.')
  }
  if (data.username === '' || data.username.length > 16) {
    throw new ValidationError('Username is required and cannot exceed 16 characters.')
  }
  if (data.email !== null && data.email.length > 50) {
    throw new ValidationError('Email cannot exceed 50 characters.')
  }
  if (!Number.isInteger(data.addressId) || data.addressId <= 0) {
    throw new ValidationError('An address must be selected.')
  }
  if (!Number.isInteger(data.storeId) || data.storeId <= 0) {
    throw new ValidationError('A store must be selected.')
  }

  return data
}

function assertPasswordValid(password: string): void {
  if (password.trim() === '' || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError('Password must be at least 6 characters long.')
  }
}

/** Use cases for the staff maintenance page (mirrors StaffService.cs). */
export interface StaffService {
  create(values: StaffFormValues): Promise<Staff>

  update(staffId: number, values: StaffFormValues): Promise<Staff>

  changePassword(staffId: number, newPassword: string): Promise<void>

  setActive(staffId: number, active: boolean): Promise<void>
}

/**
 * Service factory over the persistence port: the application layer depends
 * only on the domain contract, the concrete adapter is injected at the
 * composition root (presentation/App.tsx).
 */
export function createStaffService(repository: StaffRepository): StaffService {
  return {
    // async methods: validation failures always surface as rejected promises,
    // never as synchronous throws, so callers can uniformly `await` them.
    async create(values) {
      const data = normalizeStaffForm(values)
      assertPasswordValid(values.password)
      return repository.create(data, values.password)
    },

    async update(staffId, values) {
      const data = normalizeStaffForm(values)
      // The password is never part of an update: it has its own use case.
      return repository.update(staffId, data)
    },

    async changePassword(staffId, newPassword) {
      assertPasswordValid(newPassword)
      return repository.changePassword(staffId, newPassword)
    },

    async setActive(staffId, active) {
      return repository.setActive(staffId, active)
    },
  }
}
