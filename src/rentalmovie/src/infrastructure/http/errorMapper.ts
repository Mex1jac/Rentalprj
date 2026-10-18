import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors/domainErrors'
import { ApiError } from './httpClient'

/**
 * Translates transport failures into domain errors so upper layers depend on
 * domain failures only (mirrors the exception middleware of RentalApp.Api).
 * Unmapped statuses keep their original shape.
 */
export function mapApiError(error: unknown): unknown {
  if (!(error instanceof ApiError)) {
    return error
  }

  switch (error.status) {
    case 400:
    case 422:
      return new ValidationError(error.message)
    case 404:
      return new NotFoundError(error.message)
    case 409:
      return new ConflictError(error.message)
    default:
      return error
  }
}
