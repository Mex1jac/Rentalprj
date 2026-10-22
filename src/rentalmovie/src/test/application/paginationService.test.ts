import { describe, expect, it } from 'vitest'
import { validatePagination } from '../../application/services/paginationService'
import { ValidationError } from '../../domain/errors/domainErrors'

describe('validatePagination', () => {
  it('accepts every allowlisted page size on any page', () => {
    for (const pageSize of [10, 25, 50, 100]) {
      expect(() => validatePagination(1, pageSize)).not.toThrow()
      expect(() => validatePagination(3, pageSize)).not.toThrow()
    }
  })

  it('accepts page 1 without a page size (full list contract)', () => {
    expect(() => validatePagination(1, undefined)).not.toThrow()
  })

  it('rejects a page below 1 with the backend wording', () => {
    expect(() => validatePagination(0, 25)).toThrowError(
      'Page must be greater than or equal to 1.',
    )
    expect(() => validatePagination(-2, 25)).toThrow(ValidationError)
  })

  it('rejects a non-integer page', () => {
    expect(() => validatePagination(1.5, 25)).toThrow(ValidationError)
  })

  it('rejects a page size outside the allowlist with the backend wording', () => {
    expect(() => validatePagination(1, 15)).toThrowError(
      'Page size must be one of: 10, 25, 50, 100.',
    )
    expect(() => validatePagination(1, 0)).toThrow(ValidationError)
    expect(() => validatePagination(1, 500)).toThrow(ValidationError)
  })

  it('rejects a deeper page without a page size', () => {
    expect(() => validatePagination(2, undefined)).toThrowError(
      'Page size is required when the page is greater than 1.',
    )
  })
})
