// Domain errors (mirror Domain/Exceptions in RentalApp.Api). Their messages
// are user-facing: the UI displays them as-is, and the API returns the same
// wording for the equivalent failures.

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

/** Rule broken by the input (mirrors ValidationException). */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/** Requested entity does not exist (mirrors NotFoundException). */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

/** Conflict with current state, e.g. duplicate username (mirrors ConflictException). */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
