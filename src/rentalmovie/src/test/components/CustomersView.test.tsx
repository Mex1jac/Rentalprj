import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError } from '../../domain/errors/domainErrors'
import type { Customer } from '../../domain/entities/customer'
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
    getAll: vi.fn(async (query: CustomerListQuery) => {
      let rows = customerRows
      if (query.search) {
        rows = rows.filter((row) =>
          `${row.firstName}${row.lastName}`.toLowerCase().includes(query.search!.toLowerCase()),
        )
      }
      if (query.active !== undefined) {
        rows = rows.filter((row) => row.active === query.active)
      }
      return rows
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
  }
}

function renderApp() {
  const customerRepository = createCustomerRepository()
  const staffRepository = createStaffRepository()
  const lookupRepository = createLookupRepository()
  const rentalRepository = {
    getAll: vi.fn(async () => []),
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
