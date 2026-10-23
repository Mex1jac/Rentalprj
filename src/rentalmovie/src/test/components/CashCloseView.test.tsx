import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { describe, expect, it, vi } from 'vitest'
import type { CashCloseReport } from '../../domain/entities/cashClose'
import type { CashCloseQuery, CashCloseRepository } from '../../domain/ports/cashCloseRepository'
import { ValidationError } from '../../domain/errors/domainErrors'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { StaffListQuery } from '../../domain/ports/staffRepository'
import {
  currentMonthIso,
  resolveCashCloseRange,
  todayIso,
} from '../../application/services/cashCloseService'
import App from '../../presentation/App'

/** In-memory fake for the cash-close port (no transport in unit tests). */
function createCashCloseRepository(
  report?: (query: CashCloseQuery) => Partial<CashCloseReport>,
): CashCloseRepository & { getReport: ReturnType<typeof vi.fn> } {
  return {
    getReport: vi.fn(async (query: CashCloseQuery): Promise<CashCloseReport> => ({
      from: query.from,
      to: query.to,
      rentals: 7,
      openRentals: 3,
      returnedRentals: 4,
      distinctFilms: 2,
      amount: 42.5,
      films: [
        { filmId: 1, title: 'AIRPLANE SIERRA', rentals: 4, openRentals: 2, amount: 15.96 },
        { filmId: 2, title: 'ACADEMY DINOSAUR', rentals: 3, openRentals: 1, amount: 26.54 },
      ],
      ...report?.(query),
    })),
  }
}

/** The staff tab mounts first, so its port must be faked too. */
function createStaffRepository() {
  return {
    getAll: vi.fn(async (_query: StaffListQuery) => []),
    create: vi.fn(async () => {
      throw new Error('not used in this suite')
    }),
    update: vi.fn(async () => {
      throw new Error('not used in this suite')
    }),
    changePassword: vi.fn(async () => undefined),
    setActive: vi.fn(async () => undefined),
  }
}

function createLookupRepository(): LookupRepository {
  return {
    getAddresses: vi.fn(async () => []),
    getStores: vi.fn(async () => []),
    getFilms: vi.fn(async () => []),
    getLanguages: vi.fn(async () => []),
  }
}

function renderApp(cashCloseRepository: CashCloseRepository) {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <App
        repository={createStaffRepository()}
        lookupRepository={createLookupRepository()}
        cashCloseRepository={cashCloseRepository}
      />
    </SWRConfig>,
  )
}

async function openCashCloseTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: 'Cash close' }))
  expect(screen.getByRole('tab', { name: 'Cash close' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
}

describe('Cash close view', () => {
  it('loads today by default and renders the totals with the film breakdown', async () => {
    const user = userEvent.setup()
    const cashCloseRepository = createCashCloseRepository()
    renderApp(cashCloseRepository)

    await openCashCloseTab(user)

    // Day period starts on the operator's today (both bounds are that day).
    await waitFor(() =>
      expect(cashCloseRepository.getReport).toHaveBeenCalledWith({
        from: todayIso(),
        to: todayIso(),
      }),
    )

    // Totals strip: rentals with their split, distinct films, generated money.
    // The hero badge repeats the rentals figure, hence getAllByText.
    expect((await screen.findAllByText('7')).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('3 on rent · 4 returned')).toBeInTheDocument()
    expect(screen.getByText('titles rented in the period')).toBeInTheDocument()
    expect(screen.getByText('$42.50 USD')).toBeInTheDocument()

    // Per-film table with its money column.
    expect(screen.getByText('AIRPLANE SIERRA')).toBeInTheDocument()
    expect(screen.getByText('ACADEMY DINOSAUR')).toBeInTheDocument()
    expect(screen.getByText('$15.96 USD')).toBeInTheDocument()
    expect(screen.getByText('$26.54 USD')).toBeInTheDocument()
  })

  it('switching the period to month queries the whole current month', async () => {
    const user = userEvent.setup()
    const cashCloseRepository = createCashCloseRepository()
    renderApp(cashCloseRepository)

    await openCashCloseTab(user)
    await waitFor(() => expect(cashCloseRepository.getReport).toHaveBeenCalledTimes(1))

    await user.selectOptions(screen.getByLabelText('Period'), 'month')

    const expected = resolveCashCloseRange('month', currentMonthIso())
    await waitFor(() =>
      expect(cashCloseRepository.getReport).toHaveBeenCalledWith(expected),
    )
    expect(expected.from.endsWith('-01')).toBe(true)
    expect(expected.to).toMatch(/^\d{4}-\d{2}-(28|29|30|31)$/)
  })

  it('queries the picked day when the date input changes', async () => {
    const user = userEvent.setup()
    const cashCloseRepository = createCashCloseRepository()
    renderApp(cashCloseRepository)

    await openCashCloseTab(user)
    await waitFor(() => expect(cashCloseRepository.getReport).toHaveBeenCalledTimes(1))

    // Native date inputs are driven through change (typing digits is refused).
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-15' } })

    await waitFor(() =>
      expect(cashCloseRepository.getReport).toHaveBeenCalledWith({
        from: '2026-01-15',
        to: '2026-01-15',
      }),
    )
    expect(screen.queryByText('Pick a date')).not.toBeInTheDocument()
  })

  it('stops fetching and asks for a pick when the input is cleared', async () => {
    const user = userEvent.setup()
    const cashCloseRepository = createCashCloseRepository()
    renderApp(cashCloseRepository)

    await openCashCloseTab(user)
    await waitFor(() => expect(cashCloseRepository.getReport).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } })

    expect(await screen.findByText('Pick a date to see the report.')).toBeInTheDocument()
    expect(screen.getByText('Pick a date')).toBeInTheDocument()
    // A cleared input disables the query: no extra request is fired.
    expect(cashCloseRepository.getReport).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state for a period without rentals', async () => {
    const user = userEvent.setup()
    const cashCloseRepository = createCashCloseRepository(() => ({
      rentals: 0,
      openRentals: 0,
      returnedRentals: 0,
      distinctFilms: 0,
      amount: 0,
      films: [],
    }))
    renderApp(cashCloseRepository)

    await openCashCloseTab(user)

    expect(
      await screen.findByText('No rentals started in this period.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('surfaces a fetch error without rendering an empty table', async () => {
    const user = userEvent.setup()
    const cashCloseRepository = createCashCloseRepository()
    cashCloseRepository.getReport.mockImplementationOnce(async () => {
      throw new ValidationError('The selected period cannot span more than 366 days.')
    })
    renderApp(cashCloseRepository)

    await openCashCloseTab(user)

    expect(
      await screen.findByText('The selected period cannot span more than 366 days.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No report to show.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
