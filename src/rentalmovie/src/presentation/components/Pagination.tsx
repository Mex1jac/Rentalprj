import { PAGE_SIZES } from '../../domain/entities/pagedResult'

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  /** Disables the controls while a page is being fetched (no double clicks). */
  busy?: boolean
}

/**
 * Shared pagination controls for the customers and rentals tables: a rows-per-
 * page selector (allowlist from the API), a live region summary so screen
 * readers announce page changes, and previous/next buttons disabled at the
 * bounds so the operator can never request an out-of-range page.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  busy = false,
}: PaginationProps) {
  const lastPage = Math.max(totalPages, 1)
  const currentPage = Math.min(page, lastPage)
  const firstRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastRecord = Math.min(currentPage * pageSize, total)

  return (
    <nav className="pagination" aria-label="Pagination">
      <label className="pagination-size">
        Rows per page
        <select
          name="pageSize"
          value={pageSize}
          disabled={busy}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      <p className="pagination-summary" aria-live="polite">
        {total === 0
          ? 'No records'
          : `${firstRecord}–${lastRecord} of ${total} · Page ${currentPage} of ${lastPage}`}
      </p>

      <div className="pagination-buttons">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={busy || currentPage <= 1}
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={busy || currentPage >= lastPage}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </nav>
  )
}
