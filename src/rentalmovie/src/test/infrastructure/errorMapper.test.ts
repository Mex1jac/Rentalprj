import { describe, expect, it } from 'vitest'
import {
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '../../domain/errors/domainErrors'
import { mapApiError } from '../../infrastructure/http/errorMapper'
import { ApiError } from '../../infrastructure/http/httpClient'

describe('mapApiError', () => {
  it('maps 400 to ValidationError preserving the message', () => {
    const mapped = mapApiError(new ApiError(400, 'First name is required.'))
    expect(mapped).toBeInstanceOf(ValidationError)
    expect((mapped as ValidationError).message).toBe('First name is required.')
  })

  it('maps 422 to ValidationError', () => {
    expect(mapApiError(new ApiError(422, 'Bad input.'))).toBeInstanceOf(ValidationError)
  })

  it('maps 404 to NotFoundError', () => {
    const mapped = mapApiError(new ApiError(404, 'Staff with id 7 was not found.'))
    expect(mapped).toBeInstanceOf(NotFoundError)
    expect((mapped as NotFoundError).message).toBe('Staff with id 7 was not found.')
  })

  it('maps 409 to ConflictError', () => {
    const mapped = mapApiError(new ApiError(409, "Username 'Mike' is already in use."))
    expect(mapped).toBeInstanceOf(ConflictError)
    expect((mapped as ConflictError).message).toBe("Username 'Mike' is already in use.")
  })

  it('keeps the ApiError for unmapped statuses such as 500', () => {
    const original = new ApiError(500, 'Request failed with status 500')
    expect(mapApiError(original)).toBe(original)
  })

  it('passes non-transport errors through unchanged', () => {
    const domainError = new ValidationError('Password must be at least 6 characters long.')
    expect(mapApiError(domainError)).toBe(domainError)

    const generic = new Error('network down')
    expect(mapApiError(generic)).toBe(generic)

    expect(mapApiError('string')).toBe('string')
  })

  it('mapped errors remain DomainError instances for the UI', () => {
    expect(mapApiError(new ApiError(409, 'conflict'))).toBeInstanceOf(DomainError)
  })
})
