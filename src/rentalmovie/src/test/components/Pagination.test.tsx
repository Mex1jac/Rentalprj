import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination, type PaginationProps } from '../../presentation/components/Pagination'

function renderPagination(overrides: Partial<PaginationProps> = {}) {
  const onPageChange = vi.fn()
  const onPageSizeChange = vi.fn()
  render(
    <Pagination
      page={1}
      pageSize={25}
      total={599}
      totalPages={24}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      {...overrides}
    />,
  )
  return { onPageChange, onPageSizeChange }
}

describe('Pagination', () => {
  it('renders the range summary with the page count', () => {
    renderPagination()

    expect(screen.getByText('1–25 of 599 · Page 1 of 24')).toBeInTheDocument()
    // The summary is a live region so page changes are announced.
    expect(screen.getByText(/of 599/).closest('p')).toHaveAttribute('aria-live', 'polite')
  })

  it('offers exactly the API allowlist of page sizes with the current one selected', () => {
    renderPagination({ pageSize: 50 })

    const select = screen.getByLabelText('Rows per page')
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(options).toEqual(['10', '25', '50', '100'])
    expect(select).toHaveValue('50')
  })

  it('disables Previous on the first page and reports Next', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination()

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables Next on the last page', async () => {
    const user = userEvent.setup()
    const { onPageChange } = renderPagination({ page: 24 })

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).toHaveBeenCalledWith(23)
  })

  it('reports the selected rows per page', async () => {
    const user = userEvent.setup()
    const { onPageSizeChange } = renderPagination()

    await user.selectOptions(screen.getByLabelText('Rows per page'), '100')

    expect(onPageSizeChange).toHaveBeenCalledWith(100)
  })

  it('announces an empty result set with both arrows disabled', () => {
    renderPagination({ total: 0, totalPages: 0 })

    expect(screen.getByText('No records')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('locks every control while a page is being fetched', () => {
    renderPagination({ busy: true })

    expect(screen.getByLabelText('Rows per page')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('clamps a page number beyond the last page for the summary', () => {
    // keepPreviousData can briefly show a page number the new total no longer has.
    renderPagination({ page: 30, pageSize: 10, total: 50, totalPages: 5 })

    expect(screen.getByText('41–50 of 50 · Page 5 of 5')).toBeInTheDocument()
  })
})
