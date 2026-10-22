import { describe, expect, it, vi } from 'vitest'
import type { CustomerFormValues } from '../../application/dtos/customerDtos'
import { createCustomerService, normalizeCustomerForm } from '../../application/services/customerService'
import type { Customer } from '../../domain/entities/customer'
import { emptyPage } from '../../domain/entities/pagedResult'
import { ValidationError } from '../../domain/errors/domainErrors'
import type { CustomerListQuery } from '../../domain/ports/customerRepository'

const validValues: CustomerFormValues = {
  firstName: '  Mary ',
  lastName: ' Smith  ',
  email: '  mary@example.com  ',
  addressId: '3',
  storeId: '1',
}

function makeRepository() {
  return {
    list: vi.fn(async (_query: CustomerListQuery) => emptyPage<Customer>(1, 25)),
    create: vi.fn(async (_data: unknown) => ({}) as Customer),
    update: vi.fn(async (_customerId: number, _data: unknown) => ({}) as Customer),
    setActive: vi.fn(async (_customerId: number, _active: boolean) => undefined),
  }
}

describe('normalizeCustomerForm', () => {
  it('trims text fields and converts ids to numbers', () => {
    const data = normalizeCustomerForm(validValues)

    expect(data).toEqual({
      firstName: 'Mary',
      lastName: 'Smith',
      email: 'mary@example.com',
      addressId: 3,
      storeId: 1,
    })
  })

  it('normalizes an empty email to null', () => {
    const data = normalizeCustomerForm({ ...validValues, email: '   ' })
    expect(data.email).toBeNull()
  })

  it('rejects an empty first name with the backend wording', () => {
    expect(() => normalizeCustomerForm({ ...validValues, firstName: '   ' })).toThrowError(
      'First name is required and cannot exceed 45 characters.',
    )
  })

  it('rejects a last name longer than 45 characters', () => {
    expect(() => normalizeCustomerForm({ ...validValues, lastName: 'a'.repeat(46) })).toThrowError(
      'Last name is required and cannot exceed 45 characters.',
    )
  })

  it('rejects an email longer than 50 characters', () => {
    expect(() =>
      normalizeCustomerForm({ ...validValues, email: `${'a'.repeat(49)}@x.com` }),
    ).toThrowError('Email cannot exceed 50 characters.')
  })

  it('rejects a missing address selection', () => {
    expect(() => normalizeCustomerForm({ ...validValues, addressId: '' })).toThrowError(
      'An address must be selected.',
    )
  })

  it('rejects a missing store selection', () => {
    expect(() => normalizeCustomerForm({ ...validValues, storeId: '' })).toThrowError(
      'A store must be selected.',
    )
  })
})

describe('createCustomerService', () => {
  it('create sends normalized data to the repository', async () => {
    const repository = makeRepository()
    const service = createCustomerService(repository)

    await service.create(validValues)

    expect(repository.create).toHaveBeenCalledWith({
      firstName: 'Mary',
      lastName: 'Smith',
      email: 'mary@example.com',
      addressId: 3,
      storeId: 1,
    })
  })

  it('create rejects invalid input before touching the repository', async () => {
    const repository = makeRepository()
    const service = createCustomerService(repository)

    await expect(service.create({ ...validValues, firstName: '' })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('update normalizes and passes the customer id', async () => {
    const repository = makeRepository()
    const service = createCustomerService(repository)

    await service.update(10, validValues)

    expect(repository.update).toHaveBeenCalledWith(10, {
      firstName: 'Mary',
      lastName: 'Smith',
      email: 'mary@example.com',
      addressId: 3,
      storeId: 1,
    })
  })

  it('setActive passes the flag through untouched', async () => {
    const repository = makeRepository()
    const service = createCustomerService(repository)

    await service.setActive(10, false)

    expect(repository.setActive).toHaveBeenCalledWith(10, false)
  })
})
