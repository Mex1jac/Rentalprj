import { ValidationError } from '../../domain/errors/domainErrors'
import { PAGE_SIZES } from '../../domain/entities/pagedResult'

/**
 * Mirrors the backend pagination rules (Application/Pagination.cs) so invalid
 * combinations fail fast with exactly the wording the API would return.
 */
export function validatePagination(page: number, pageSize?: number): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new ValidationError('Page must be greater than or equal to 1.')
  }
  if (pageSize === undefined) {
    if (page > 1) {
      throw new ValidationError('Page size is required when the page is greater than 1.')
    }
    return
  }
  if (!PAGE_SIZES.includes(pageSize)) {
    throw new ValidationError(`Page size must be one of: ${PAGE_SIZES.join(', ')}.`)
  }
}
