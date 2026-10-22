/**
 * Server-side page of results (mirrors PagedResultDto.cs): the list endpoints
 * return one slice of items plus the totals needed to render pagination.
 */
export interface PagedResult<T> {
  items: T[]
  /** 1-based page number. */
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Page sizes accepted by the API (mirrors Pagination.cs allowlist). */
export const PAGE_SIZES = [10, 25, 50, 100]

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 25

/** Envelope shown while the first page is still loading. */
export function emptyPage<T>(page: number, pageSize: number): PagedResult<T> {
  return { items: [], page, pageSize, total: 0, totalPages: 1 }
}
