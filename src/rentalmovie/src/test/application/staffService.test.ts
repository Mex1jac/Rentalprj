import { describe, expect, it, vi } from 'vitest'
import type { StaffFormValues } from '../../application/dtos/staffDtos'
import { createStaffService, normalizeStaffForm } from '../../application/services/staffService'
import type { Staff } from '../../domain/entities/staff'
import { ValidationError } from '../../domain/errors/domainErrors'
import type { StaffListQuery } from '../../domain/ports/staffRepository'

const validValues: StaffFormValues = {
  firstName: '  Jane ',
  lastName: ' Smith  ',
  email: '  jane@example.com  ',
  addressId: '3',
  storeId: '1',
  username: ' jsmith ',
  password: 'secret123',
}

function makeRepository() {
  return {
    getAll: vi.fn(async (_query: StaffListQuery) => [] as Staff[]),
    create: vi.fn(async (_data: unknown, _password: string) => ({}) as Staff),
    update: vi.fn(async (_staffId: number, _data: unknown) => ({}) as Staff),
    changePassword: vi.fn(async (_staffId: number, _newPassword: string) => undefined),
    setActive: vi.fn(async (_staffId: number, _active: boolean) => undefined),
  }
}

describe('normalizeStaffForm', () => {
  it('trims text fields and converts ids to numbers', () => {
    const data = normalizeStaffForm(validValues)

    expect(data).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      addressId: 3,
      storeId: 1,
      username: 'jsmith',
    })
  })

  it('normalizes an empty email to null', () => {
    const data = normalizeStaffForm({ ...validValues, email: '   ' })
    expect(data.email).toBeNull()
  })

  it('rejects an empty first name with the backend wording', () => {
    expect(() => normalizeStaffForm({ ...validValues, firstName: '   ' })).toThrowError(
      'First name is required and cannot exceed 45 characters.',
    )
  })

  it('rejects a username longer than 16 characters', () => {
    expect(() => normalizeStaffForm({ ...validValues, username: 'a'.repeat(17) })).toThrowError(
      'Username is required and cannot exceed 16 characters.',
    )
  })

  it('rejects an email longer than 50 characters', () => {
    expect(() =>
      normalizeStaffForm({ ...validValues, email: `${'a'.repeat(49)}@x.com` }),
    ).toThrowError('Email cannot exceed 50 characters.')
  })

  it('rejects a missing address selection', () => {
    expect(() => normalizeStaffForm({ ...validValues, addressId: '' })).toThrowError(
      'An address must be selected.',
    )
  })

  it('rejects a missing store selection', () => {
    expect(() => normalizeStaffForm({ ...validValues, storeId: '' })).toThrowError(
      'A store must be selected.',
    )
  })
})

describe('createStaffService', () => {
  it('create sends normalized data and the clear password to the repository', async () => {
    const repository = makeRepository()
    const service = createStaffService(repository)

    await service.create(validValues)

    expect(repository.create).toHaveBeenCalledWith(
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        addressId: 3,
        storeId: 1,
        username: 'jsmith',
      },
      'secret123',
    )
  })

  it('create rejects a short password before touching the repository', async () => {
    const repository = makeRepository()
    const service = createStaffService(repository)

    await expect(service.create({ ...validValues, password: 'abc' })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create rejects a whitespace-only password', async () => {
    const repository = makeRepository()
    const service = createStaffService(repository)

    await expect(service.create({ ...validValues, password: '      ' })).rejects.toThrowError(
      'Password must be at least 6 characters long.',
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('update never sends a password field', async () => {
    const repository = makeRepository()
    const service = createStaffService(repository)

    await service.update(7, { ...validValues, password: '' })

    expect(repository.update).toHaveBeenCalledTimes(1)
    const [staffId, data] = repository.update.mock.calls[0]
    expect(staffId).toBe(7)
    expect(data).not.toHaveProperty('password')
    expect(data).toMatchObject({ username: 'jsmith' })
  })

  it('changePassword delegates a valid password', async () => {
    const repository = makeRepository()
    const service = createStaffService(repository)

    await service.changePassword(7, 'secret123')

    expect(repository.changePassword).toHaveBeenCalledWith(7, 'secret123')
  })

  it('changePassword rejects a short password', async () => {
    const repository = makeRepository()
    const service = createStaffService(repository)

    await expect(service.changePassword(7, 'abc')).rejects.toThrowError(
      'Password must be at least 6 characters long.',
    )
    expect(repository.changePassword).not.toHaveBeenCalled()
  })

  it('setActive passes the flag through untouched', async () => {
    const repository = makeRepository()
    const service = createStaffService(repository)

    await service.setActive(7, false)

    expect(repository.setActive).toHaveBeenCalledWith(7, false)
  })
})
