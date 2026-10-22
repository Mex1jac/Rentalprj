import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError } from '../../domain/errors/domainErrors'
import type { Customer } from '../../domain/entities/customer'
import type { FilmOption, StoreOption } from '../../domain/entities/lookup'
import type { Rental, RentalCreateData } from '../../domain/entities/rental'
import type { Staff } from '../../domain/entities/staff'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { CustomerListQuery } from '../../domain/ports/customerRepository'
import type { RentalListQuery } from '../../domain/ports/rentalRepository'
import type { StaffListQuery } from '../../domain/ports/staffRepository'
import App from '../../presentation/App'

const mary: Customer = {
  customerId: 10,
  firstName: 'Mary',
  lastName: 'Smith',
  email: 'mary@example.com',
  addressId: 3,
  address: '23 Workhaven Lane, Lethbridge',
  storeId: 1,
  store: 'Store 1',
  active: true,
}

const mike: Staff = {
  staffId: 1,
  firstName: 'Mike',
  lastName: 'Hillyer',
  email: null,
  addressId: 3,
  address: '23 Workhaven Lane, Lethbridge',
  storeId: 1,
  store: 'Store 1',
  active: true,
  username: 'Mike',
}

const openRental: Rental = {
  rentalId: 101,
  rentalDate: '2026-10-18T10:00:00',
  dueDate: '2026-10-24T10:00:00',
  returnDate: null,
  overdue: false,
  customerId: 10,
  customer: 'Mary Smith',
  storeId: 1,
  store: 'Store 1',
  staff: 'Mike Hillyer',
  filmId: 1,
  filmTitle: 'ACADEMY DINOSAUR',
  inventoryId: 5001,
}

const films: FilmOption[] = [
  { filmId: 1, title: 'ACADEMY DINOSAUR', rentalDurationDays: 3, rentalRate: 4.99, availableCopies: 2 },
  // No copies available right now: hidden from the rental picker.
  { filmId: 2, title: 'ACE GOLDFINGER', rentalDurationDays: 6, rentalRate: 2.99, availableCopies: 0 },
]

const addresses = [{ addressId: 3, display: '23 Workhaven Lane, Lethbridge' }]
const stores: StoreOption[] = [{ storeId: 1, display: 'Store 1 - 47 MySakila Drive' }]

let rentalRows: Rental[]

/**
 * In-memory fake for the persistence ports: the application and presentation
 * layers are tested without any transport (SWR still caches, deduplicates and
 * revalidates these calls exactly as in production).
 */
function createRentalRepository() {
  return {
    list: vi.fn(async (query: RentalListQuery) => {
      let rows = rentalRows
      if (query.status === 'open') {
        rows = rows.filter((row) => row.returnDate === null)
      } else if (query.status === 'returned') {
        rows = rows.filter((row) => row.returnDate !== null)
      }
      if (query.search) {
        rows = rows.filter((row) =>
          `${row.customer}${row.filmTitle}`.toLowerCase().includes(query.search!.toLowerCase()),
        )
      }
      // Mirrors the API envelope: slice only when a page size is requested.
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? rows.length
      const offset = (page - 1) * Math.max(pageSize, 1)
      return {
        items: pageSize > 0 ? rows.slice(offset, offset + pageSize) : [],
        page,
        pageSize,
        total: rows.length,
        totalPages: pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1,
      }
    }),
    create: vi.fn(async (data: RentalCreateData) => {
      const created: Rental = {
        rentalId: 900,
        rentalDate: '2026-10-20T10:00:00',
        dueDate: '2026-10-23T10:00:00',
        returnDate: null,
        overdue: false,
        customerId: data.customerId,
        customer: 'Mary Smith',
        storeId: data.storeId,
        store: 'Store 1',
        staff: 'Mike Hillyer',
        filmId: data.filmIds[0],
        filmTitle: 'ACADEMY DINOSAUR',
        inventoryId: 5002,
      }
      rentalRows = [...rentalRows, created]
      return [created]
    }),
    markReturned: vi.fn(async (rentalId: number) => {
      const updated: Rental = {
        ...rentalRows.find((row) => row.rentalId === rentalId)!,
        returnDate: '2026-10-21T09:00:00',
        overdue: false,
      }
      rentalRows = rentalRows.map((row) => (row.rentalId === rentalId ? updated : row))
      return updated
    }),
  }
}

function createCustomerRepository() {
  return {
    list: vi.fn(async (query: CustomerListQuery) => {
      let rows = [mary]
      if (query.active !== undefined) {
        rows = rows.filter((row) => row.active === query.active)
      }
      // Full list for dropdowns (no page/pageSize in the query).
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? rows.length
      const offset = (page - 1) * Math.max(pageSize, 1)
      return {
        items: pageSize > 0 ? rows.slice(offset, offset + pageSize) : [],
        page,
        pageSize,
        total: rows.length,
        totalPages: pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1,
      }
    }),
    create: vi.fn(async (_data: unknown) => {
      throw new Error('not used in this suite')
    }),
    update: vi.fn(async (_customerId: number, _data: unknown) => {
      throw new Error('not used in this suite')
    }),
    setActive: vi.fn(async (_customerId: number, _active: boolean) => undefined),
  }
}

/** The staff tab mounts first and the rentals picker needs active staff. */
function createStaffRepository() {
  return {
    getAll: vi.fn(async (_query: StaffListQuery) => [mike]),
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
    getAddresses: vi.fn(async () => addresses),
    getStores: vi.fn(async () => stores),
    getFilms: vi.fn(async (_storeId: number) => films),
    getLanguages: vi.fn(async () => []),
  }
}

function renderApp() {
  const rentalRepository = createRentalRepository()
  const customerRepository = createCustomerRepository()
  const staffRepository = createStaffRepository()
  const lookupRepository = createLookupRepository()

  // A fresh cache provider per render keeps tests isolated (client-swr-dedup).
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <App
        repository={staffRepository}
        lookupRepository={lookupRepository}
        customerRepository={customerRepository}
        rentalRepository={rentalRepository}
      />
    </SWRConfig>,
  )
  return { rentalRepository, customerRepository, staffRepository, lookupRepository }
}

async function openRentalsTab() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('tab', { name: 'Rentals' }))
  await screen.findByText('ACADEMY DINOSAUR')
  return user
}

/** Fills the create modal up to the point where films are listed. */
async function fillPartyAndStore(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '+ New rental' }))
  await user.selectOptions(screen.getByLabelText('Customer'), '10')
  await user.selectOptions(screen.getByLabelText('Staff member'), '1')
  await user.selectOptions(screen.getByLabelText('Store'), '1')
}

beforeEach(() => {
  rentalRows = [openRental]
})

describe('Rentals view', () => {
  it('lists open rentals with the open filter by default', async () => {
    const { rentalRepository } = renderApp()
    const user = await openRentalsTab()

    expect(screen.getByRole('tab', { name: 'Rentals' })).toHaveAttribute('aria-selected', 'true')
    const table = screen.getByRole('table')
    expect(within(table).getByText('Mary Smith')).toBeInTheDocument()
    expect(within(table).getByText('Open')).toBeInTheDocument()
    expect(rentalRepository.list).toHaveBeenCalledWith({
      search: undefined,
      status: 'open',
      page: 1,
      pageSize: 25,
    })
    expect(user).toBeDefined()
  })

  it('registers a return and moves the row out of the open filter', async () => {
    const { rentalRepository } = renderApp()
    const user = await openRentalsTab()

    await user.click(screen.getByRole('button', { name: 'Return' }))

    await waitFor(() => expect(rentalRepository.markReturned).toHaveBeenCalledWith(101))
    expect(await screen.findByText('No rentals found.')).toBeInTheDocument()

    // The row still exists under the returned/all filters, now as Returned.
    await user.selectOptions(screen.getByLabelText('Status'), 'all')
    const table = screen.getByRole('table')
    expect(await within(table).findByText('Returned')).toBeInTheDocument()
    expect(within(table).queryByRole('button', { name: 'Return' })).not.toBeInTheDocument()
  })

  it('rents films through the batch create with the film-default days', async () => {
    const { rentalRepository, lookupRepository } = renderApp()
    const user = await openRentalsTab()

    await fillPartyAndStore(user)

    // The films of the selected store are fetched (storeId lifted to the view).
    const filmCheckbox = await screen.findByRole('checkbox', { name: /ACADEMY DINOSAUR/ })
    expect(lookupRepository.getFilms).toHaveBeenCalledWith(1)
    expect(screen.getByRole('spinbutton', { name: /Rental days/ })).toHaveValue(6)

    // Untouched days follow the suggestion of the selected film (3 days).
    await user.click(filmCheckbox)
    expect(screen.getByRole('spinbutton', { name: /Rental days/ })).toHaveValue(3)
    expect(screen.getByText('1 film(s) selected · 3 day(s)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rent 1 film(s)' }))

    // The service normalized the raw form values before hitting the port.
    await waitFor(() =>
      expect(rentalRepository.create).toHaveBeenCalledWith({
        customerId: 10,
        staffId: 1,
        storeId: 1,
        rentalDays: 3,
        filmIds: [1],
      }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // The list was revalidated and shows the created row (rentalId 900).
    expect(await screen.findByText('900')).toBeInTheDocument()
  })

  it('surfaces a batch conflict inside the dialog and keeps it open', async () => {
    const { rentalRepository } = renderApp()
    rentalRepository.create.mockImplementationOnce(async () => {
      throw new ConflictError(
        'The selected films no longer have enough available copies. Refresh and try again.',
      )
    })
    const user = await openRentalsTab()

    await fillPartyAndStore(user)
    await user.click(await screen.findByRole('checkbox', { name: /ACADEMY DINOSAUR/ }))
    await user.click(screen.getByRole('button', { name: 'Rent 1 film(s)' }))

    expect(
      await screen.findByText(
        'The selected films no longer have enough available copies. Refresh and try again.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /new rental/i })).toBeInTheDocument()
  })

  it('shows a return conflict at page level (double return race)', async () => {
    const { rentalRepository } = renderApp()
    rentalRepository.markReturned.mockImplementationOnce(async () => {
      throw new ConflictError('Rental with id 101 was already returned.')
    })
    const user = await openRentalsTab()

    await user.click(screen.getByRole('button', { name: 'Return' }))

    expect(await screen.findByText('Rental with id 101 was already returned.')).toBeInTheDocument()
    // The row remains listed as open: nothing changed on the server.
    expect(within(screen.getByRole('table')).getByText('Open')).toBeInTheDocument()
  })
})

describe('Rentals view pagination', () => {
  beforeEach(() => {
    // 11 open rentals: at 10 per page, page 2 holds exactly one row.
    rentalRows = Array.from({ length: 11 }, (_, index) => ({
      ...openRental,
      rentalId: 101 + index,
      filmTitle: index === 0 ? openRental.filmTitle : `FILM ${index + 1}`,
    }))
  })

  it('applies a page size and requests the second slice', async () => {
    const { rentalRepository } = renderApp()
    const user = await openRentalsTab()

    // The default request carries the default page (1) and page size (25).
    await waitFor(() =>
      expect(rentalRepository.list).toHaveBeenCalledWith({
        search: undefined,
        status: 'open',
        page: 1,
        pageSize: 25,
      }),
    )

    await user.selectOptions(screen.getByLabelText('Rows per page'), '10')
    expect(await screen.findByText('1–10 of 11 · Page 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('11–11 of 11 · Page 2 of 2')).toBeInTheDocument()
    expect(await screen.findByText('FILM 11')).toBeInTheDocument()
    expect(screen.queryByText('ACADEMY DINOSAUR')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await waitFor(() =>
      expect(rentalRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 10 }),
      ),
    )
  })

  it('steps back one page when the only open row of a page is returned', async () => {
    const { rentalRepository } = renderApp()
    const user = await openRentalsTab()

    await user.selectOptions(screen.getByLabelText('Rows per page'), '10')
    await user.click(await screen.findByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('11–11 of 11 · Page 2 of 2')).toBeInTheDocument()

    const row = screen.getByText('FILM 11').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Return' }))

    await waitFor(() => expect(rentalRepository.markReturned).toHaveBeenCalledWith(111))
    // The row left the "Open" filter, so the view steps back to page 1.
    expect(await screen.findByText('1–10 of 10 · Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('ACADEMY DINOSAUR')).toBeInTheDocument()
  })
})
