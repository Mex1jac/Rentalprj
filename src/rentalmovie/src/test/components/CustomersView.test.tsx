import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError } from '../../domain/errors/domainErrors'
import type { Customer } from '../../domain/entities/customer'
import type { Rental } from '../../domain/entities/rental'
import { emptyPage } from '../../domain/entities/pagedResult'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { CustomerListQuery } from '../../domain/ports/customerRepository'
import type { RentalRepository } from '../../domain/ports/rentalRepository'
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

const addresses = [{ addressId: 3, display: '23 Workhaven Lane, Lethbridge' }]
const stores = [{ storeId: 1, display: 'Store 1 - 47 MySakila Drive' }]

let customerRows: Customer[]

/**
 * In-memory fake for the persistence ports: the application and presentation
 * layers are tested without any transport (rule client-swr-dedup applies the
 * same way since SWR still caches and deduplicates these calls).
 */
function createCustomerRepository() {
  return {
    list: vi.fn(async (query: CustomerListQuery) => {
      let rows = customerRows
      if (query.search) {
        rows = rows.filter((row) =>
          `${row.firstName}${row.lastName}`.toLowerCase().includes(query.search!.toLowerCase()),
        )
      }
      if (query.active !== undefined) {
        rows = rows.filter((row) => row.active === query.active)
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
    create: vi.fn(async (data) => {
      const created: Customer = {
        customerId: 99,
        ...data,
        address: '23 Workhaven Lane, Lethbridge',
        store: 'Store 1',
        active: true,
      }
      customerRows = [...customerRows, created]
      return created
    }),
    update: vi.fn(async (customerId: number, data) => {
      customerRows = customerRows.map((row) => (row.customerId === customerId ? { ...row, ...data } : row))
      return customerRows.find((row) => row.customerId === customerId)!
    }),
    setActive: vi.fn(async (customerId: number, active: boolean) => {
      customerRows = customerRows.map((row) => (row.customerId === customerId ? { ...row, active } : row))
    }),
  }
}

/** The staff tab mounts first (and the rentals tab needs staff too). */
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
    getAddresses: vi.fn(async () => addresses),
    getStores: vi.fn(async () => stores),
    getFilms: vi.fn(async () => []),
    getLanguages: vi.fn(async () => []),
  }
}

function renderApp() {
  const customerRepository = createCustomerRepository()
  const staffRepository = createStaffRepository()
  const lookupRepository = createLookupRepository()
  const rentalRepository = {
    list: vi.fn(async () => emptyPage<Rental>(1, 25)),
    create: vi.fn(async () => []),
    markReturned: vi.fn(async () => {
      throw new Error('not used in this suite')
    }),
  } satisfies RentalRepository

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
  return { customerRepository, staffRepository, lookupRepository, rentalRepository }
}

beforeEach(() => {
  customerRows = [mary]
})

describe('Customers view', () => {
  it('lists the members after switching to the Customers tab', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: 'Customers' }))

    expect(await screen.findByText('Mary Smith')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Customers' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('table')).getByText('Active')).toBeInTheDocument()
  })

  it('creates a member through the service and refreshes the list', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    await screen.findByText('Mary Smith')

    await user.click(screen.getByRole('button', { name: '+ New customer' }))
    await user.type(screen.getByLabelText('First name'), ' Ana ')
    await user.type(screen.getByLabelText('Last name'), 'Garcia')
    await user.type(screen.getByLabelText('Email'), ' ana@example.com ')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    // The service normalizes before the port is touched.
    await waitFor(() =>
      expect(customerRepository.create).toHaveBeenCalledWith({
        firstName: 'Ana',
        lastName: 'Garcia',
        email: 'ana@example.com',
        addressId: 3,
        storeId: 1,
      }),
    )
    expect(await screen.findByText('Ana Garcia')).toBeInTheDocument()
  })

  it('edits a member through the service', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    await screen.findByText('Mary Smith')

    const row = screen.getByText('Mary Smith').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Edit' }))

    await user.clear(screen.getByLabelText('First name'))
    await user.type(screen.getByLabelText('First name'), 'María')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(customerRepository.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ firstName: 'María', lastName: 'Smith' }),
      ),
    )
    expect(await screen.findByText('María Smith')).toBeInTheDocument()
  })

  it('deactivates a member through the logical leave port', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    await screen.findByText('Mary Smith')

    const row = screen.getByText('Mary Smith').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(customerRepository.setActive).toHaveBeenCalledWith(10, false))
    expect(await within(screen.getByRole('table')).findByText('Inactive')).toBeInTheDocument()
  })

  it('surfaces a domain conflict at page level (deactivate blocked by open rentals)', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()
    customerRepository.setActive.mockImplementationOnce(async () => {
      throw new ConflictError('Customer with id 10 has 2 open rentals and cannot be deactivated.')
    })
    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    await screen.findByText('Mary Smith')

    const row = screen.getByText('Mary Smith').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Deactivate' }))

    expect(
      await screen.findByText('Customer with id 10 has 2 open rentals and cannot be deactivated.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('surfaces a create conflict in the modal and keeps it open', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()
    customerRepository.create.mockImplementationOnce(async () => {
      throw new ConflictError('Address with id 99 does not exist.')
    })
    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    await screen.findByText('Mary Smith')

    await user.click(screen.getByRole('button', { name: '+ New customer' }))
    await user.type(screen.getByLabelText('First name'), 'Dup')
    await user.type(screen.getByLabelText('Last name'), 'User')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Address with id 99 does not exist.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /new customer/i })).toBeInTheDocument()
  })
})

describe('Customers view pagination', () => {
  beforeEach(() => {
    // 30 rows: two full pages of 25 plus a short second page.
    customerRows = Array.from({ length: 30 }, (_, index) => ({
      ...mary,
      customerId: index + 1,
      firstName: `Member${index + 1}`,
    }))
  })

  it('starts on page 1 with 25 rows and moves to the second slice', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()

    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    expect(await screen.findByText('Member1 Smith')).toBeInTheDocument()

    // The first request carries the default page size.
    await waitFor(() =>
      expect(customerRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 25 }),
      ),
    )
    expect(screen.getByText('1–25 of 30 · Page 1 of 2')).toBeInTheDocument()
    expect(screen.queryByText('Member30 Smith')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('26–30 of 30 · Page 2 of 2')).toBeInTheDocument()
    expect(await screen.findByText('Member30 Smith')).toBeInTheDocument()
    expect(screen.queryByText('Member1 Smith')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await waitFor(() =>
      expect(customerRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 25 }),
      ),
    )
  })

  it('applies a new page size from the selector', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()

    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    expect(await screen.findByText('Member1 Smith')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Rows per page'), '10')

    expect(await screen.findByText('1–10 of 30 · Page 1 of 3')).toBeInTheDocument()
    await waitFor(() =>
      expect(customerRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
      ),
    )
  })

  it('restarts at page 1 when the search changes from a deeper page', async () => {
    const user = userEvent.setup()
    const { customerRepository } = renderApp()

    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    await user.click(await screen.findByRole('button', { name: 'Next page' }))
    await screen.findByText('26–30 of 30 · Page 2 of 2')

    await user.type(screen.getByLabelText('Search'), 'member1')

    await waitFor(() =>
      expect(customerRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'member1', page: 1 }),
      ),
    )
    // 'member1' matches Member1 + Member10..Member19 as a substring.
    expect(await screen.findByText('1–11 of 11 · Page 1 of 1')).toBeInTheDocument()
  })

  it('steps back one page when the only row of a page is deactivated', async () => {
    const user = userEvent.setup()
    renderApp()
    // 11 rows at 10 per page: page 2 holds exactly one member.
    customerRows = Array.from({ length: 11 }, (_, index) => ({
      ...mary,
      customerId: index + 1,
      firstName: `Member${index + 1}`,
    }))

    await user.click(screen.getByRole('tab', { name: 'Customers' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'true')
    await user.selectOptions(screen.getByLabelText('Rows per page'), '10')
    expect(await screen.findByText('1–10 of 11 · Page 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('11–11 of 11 · Page 2 of 2')).toBeInTheDocument()

    const row = screen.getByText('Member11 Smith').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Deactivate' }))

    // The row leaves the "Active" filter, so the view steps back to page 1.
    expect(await screen.findByText('1–10 of 10 · Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Member1 Smith')).toBeInTheDocument()
  })
})
