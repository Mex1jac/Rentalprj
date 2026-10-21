import { ValidationError } from '../../domain/errors/domainErrors'
import type { Customer, CustomerData } from '../../domain/entities/customer'
import type { CustomerRepository } from '../../domain/ports/customerRepository'
import type { CustomerFormValues } from '../dtos/customerDtos'

/**
 * Normalizes raw form values into domain data and mirrors the backend
 * validations (Application/Services/CustomerService.cs) so invalid input fails
 * fast with exactly the wording the API would return.
 */
export function normalizeCustomerForm(values: CustomerFormValues): CustomerData {
  const data: CustomerData = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim() === '' ? null : values.email.trim(),
    addressId: Number(values.addressId),
    storeId: Number(values.storeId),
  }

  if (data.firstName === '' || data.firstName.length > 45) {
    throw new ValidationError('First name is required and cannot exceed 45 characters.')
  }
  if (data.lastName === '' || data.lastName.length > 45) {
    throw new ValidationError('Last name is required and cannot exceed 45 characters.')
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

/** Use cases for the members page (mirrors CustomerService.cs). */
export interface CustomerService {
  create(values: CustomerFormValues): Promise<Customer>

  update(customerId: number, values: CustomerFormValues): Promise<Customer>

  setActive(customerId: number, active: boolean): Promise<void>
}

/**
 * Service factory over the persistence port: the application layer depends
 * only on the domain contract, the concrete adapter is injected at the
 * composition root (presentation/App.tsx).
 */
export function createCustomerService(repository: CustomerRepository): CustomerService {
  return {
    // async methods: validation failures always surface as rejected promises,
    // never as synchronous throws, so callers can uniformly `await` them.
    async create(values) {
      return repository.create(normalizeCustomerForm(values))
    },

    async update(customerId, values) {
      return repository.update(customerId, normalizeCustomerForm(values))
    },

    async setActive(customerId, active) {
      return repository.setActive(customerId, active)
    },
  }
}
