import { describe, expect, it } from 'vitest'
import { displayName, type Staff } from '../../domain/entities/staff'
import { ConflictError, DomainError, NotFoundError, ValidationError } from '../../domain/errors/domainErrors'

const staff: Staff = {
  staffId: 1,
  firstName: 'Mike',
  lastName: 'Hillyer',
  email: null,
  addressId: 3,
  address: '23 Workhaven Lane',
  storeId: 1,
  store: 'Store 1',
  active: true,
  username: 'Mike',
}

describe('displayName', () => {
  it('joins first and last name', () => {
    expect(displayName(staff)).toBe('Mike Hillyer')
  })
})

describe('domain errors', () => {
  const cases: Array<[new (message: string) => DomainError, string]> = [
    [ValidationError, 'ValidationError'],
    [NotFoundError, 'NotFoundError'],
    [ConflictError, 'ConflictError'],
  ]

  it.each(cases)('%p reports its own name as a DomainError', (ErrorCtor, name) => {
    const error = new ErrorCtor('Something went wrong.')
    expect(error).toBeInstanceOf(DomainError)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe(name)
    expect(error.message).toBe('Something went wrong.')
  })
})
