import { describe, expect, it, vi } from 'vitest'
import type { RentalFormValues } from '../../application/dtos/rentalDtos'
import { createRentalService, normalizeRentalForm } from '../../application/services/rentalService'
import type { Rental } from '../../domain/entities/rental'
import { emptyPage } from '../../domain/entities/pagedResult'
import { ValidationError } from '../../domain/errors/domainErrors'
import type { RentalListQuery } from '../../domain/ports/rentalRepository'

const validValues: RentalFormValues = {
  customerId: '10',
  staffId: '1',
  storeId: '1',
  rentalDays: '5',
  filmIds: ['1', '2'],
}

function makeRepository() {
  return {
    list: vi.fn(async (_query: RentalListQuery) => emptyPage<Rental>(1, 25)),
    create: vi.fn(async (_data: unknown) => [] as Rental[]),
    markReturned: vi.fn(async (_rentalId: number) => ({}) as Rental),
  }
}

describe('normalizeRentalForm', () => {
  it('converts ids and days to numbers', () => {
    const data = normalizeRentalForm(validValues)

    expect(data).toEqual({
      customerId: 10,
      staffId: 1,
      storeId: 1,
      rentalDays: 5,
      filmIds: [1, 2],
    })
  })

  it('rejects a missing customer selection', () => {
    expect(() => normalizeRentalForm({ ...validValues, customerId: '' })).toThrowError(
      'A customer must be selected.',
    )
  })

  it('rejects a missing staff selection', () => {
    expect(() => normalizeRentalForm({ ...validValues, staffId: '' })).toThrowError(
      'A staff member must be selected.',
    )
  })

  it('rejects a missing store selection', () => {
    expect(() => normalizeRentalForm({ ...validValues, storeId: '' })).toThrowError(
      'A store must be selected.',
    )
  })

  it('rejects an empty days field with the backend wording', () => {
    expect(() => normalizeRentalForm({ ...validValues, rentalDays: '' })).toThrowError(
      'Rental days must be between 1 and 90.',
    )
  })

  it.each([0, -3, 91, 'abc'])('rejects the days value %s', (days) => {
    expect(() => normalizeRentalForm({ ...validValues, rentalDays: String(days) })).toThrowError(
      'Rental days must be between 1 and 90.',
    )
  })

  it('rejects a rental without films', () => {
    expect(() => normalizeRentalForm({ ...validValues, filmIds: [] })).toThrowError(
      'At least one film must be selected.',
    )
  })

  it('rejects a rental with non-numeric film ids', () => {
    expect(() => normalizeRentalForm({ ...validValues, filmIds: ['abc'] })).toThrowError(
      'At least one film must be selected.',
    )
  })

  it('rejects more than 50 films', () => {
    const filmIds = Array.from({ length: 51 }, (_, index) => String(index + 1))
    expect(() => normalizeRentalForm({ ...validValues, filmIds })).toThrowError(
      'A rental can include at most 50 films.',
    )
  })
})

describe('createRentalService', () => {
  it('create sends normalized data to the repository', async () => {
    const repository = makeRepository()
    const service = createRentalService(repository)

    await service.create(validValues)

    expect(repository.create).toHaveBeenCalledWith({
      customerId: 10,
      staffId: 1,
      storeId: 1,
      rentalDays: 5,
      filmIds: [1, 2],
    })
  })

  it('create rejects invalid input before touching the repository', async () => {
    const repository = makeRepository()
    const service = createRentalService(repository)

    await expect(service.create({ ...validValues, filmIds: [] })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('returnRental delegates to markReturned', async () => {
    const repository = makeRepository()
    const service = createRentalService(repository)

    await service.returnRental(101)

    expect(repository.markReturned).toHaveBeenCalledWith(101)
  })
})
