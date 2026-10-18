/**
 * Maps any error thrown by the application or infrastructure layers to a
 * user-facing message. Domain errors carry ready-to-display wording (they
 * mirror the API error contract); anything else falls back to a generic
 * notice.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== '') {
    return error.message
  }
  return 'Unexpected error.'
}
