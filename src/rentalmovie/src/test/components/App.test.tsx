import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError } from '../../domain/errors/domainErrors'
import type { Staff } from '../../domain/entities/staff'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { StaffListQuery, StaffRepository } from '../../domain/ports/staffRepository'
import App from '../../presentation/App'

const mike: Staff = {
  staffId: 1,
  firstName: 'Mike',
  lastName: 'Hillyer',
  email: 'Mike.Hillyer@sakilastaff.com',
  addressId: 3,
  address: '23 Workhaven Lane, Lethbridge',
  storeId: 1,
  store: 'Store 1',
  active: true,
  username: 'Mike',
}

const jon: Staff = {
  staffId: 2,
  firstName: 'Jon',
  lastName: 'Stephens',
  email: 'Jon.Stephens@sakilastaff.com',
  addressId: 4,
  address: '1411 Lillydale Drive, Woodridge',
  storeId: 2,
  store: 'Store 2',
  active: true,
  username: 'Jon',
}

const addresses = [{ addressId: 3, display: '23 Workhaven Lane, Lethbridge' }]
const stores = [{ storeId: 1, display: 'Store 1 - 47 MySakila Drive' }]

let staffRows: Staff[]

/**
 * In-memory fake for the persistence port: the application and presentation
 * layers are tested without any transport (rule client-swr-dedup applies the
 * same way since SWR still caches and deduplicates these calls).
 */
function createRepository() {
  return {
    getAll: vi.fn(async (query: StaffListQuery) => {
      let rows = staffRows
      if (query.search) {
        rows = rows.filter((row) => row.username.toLowerCase().includes(query.search!.toLowerCase()))
      }
      return rows
    }),
    create: vi.fn(async (data, password) => {
      void password
      const created: Staff = {
        staffId: 9,
        ...data,
        address: '23 Workhaven Lane, Lethbridge',
        store: 'Store 1',
        active: true,
      }
      staffRows = [...staffRows, created]
      return created
    }),
    update: vi.fn(async (staffId, data) => {
      staffRows = staffRows.map((row) => (row.staffId === staffId ? { ...row, ...data } : row))
      return staffRows.find((row) => row.staffId === staffId)!
    }),
    changePassword: vi.fn(async () => undefined),
    setActive: vi.fn(async (staffId, active) => {
      staffRows = staffRows.map((row) => (row.staffId === staffId ? { ...row, active } : row))
    }),
  }
}

function createLookupRepository(): LookupRepository {
  return {
    getAddresses: vi.fn(async () => addresses),
    getStores: vi.fn(async () => stores),
    getFilms: vi.fn(async () => []),
  }
}

function renderApp(
  repository: StaffRepository = createRepository(),
  lookupRepository: LookupRepository = createLookupRepository(),
) {
  // A fresh cache provider per render keeps tests isolated (client-swr-dedup).
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <App repository={repository} lookupRepository={lookupRepository} />
    </SWRConfig>,
  )
  return { repository, lookupRepository }
}

beforeEach(() => {
  staffRows = [mike, jon]
})

describe('App staff list', () => {
  it('renders rows and fetches each resource exactly once', async () => {
    const { repository, lookupRepository } = renderApp()

    expect(await screen.findByText('Mike Hillyer')).toBeInTheDocument()
    expect(screen.getByText('Jon Stephens')).toBeInTheDocument()
    // Scope to the table: the status <select> also contains an "Active" option.
    expect(within(screen.getByRole('table')).getAllByText('Active')).toHaveLength(2)

    await waitFor(() => expect(lookupRepository.getStores).toHaveBeenCalledTimes(1))
    expect(repository.getAll).toHaveBeenCalledTimes(1)
    expect(lookupRepository.getAddresses).toHaveBeenCalledTimes(1)
  })

  it('passes the deferred search term to the repository', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Mike Hillyer')

    await user.type(screen.getByLabelText('Search'), 'jon')

    await waitFor(() =>
      expect(repository.getAll).toHaveBeenCalledWith({ search: 'jon', active: undefined }),
    )
  })

  it('restores the unfiltered results from cache when the search is cleared', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Mike Hillyer')

    const input = screen.getByLabelText('Search')
    await user.type(input, 'jon')
    await waitFor(() => expect(repository.getAll).toHaveBeenCalledWith({ search: 'jon', active: undefined }))

    await user.clear(input)

    // The unfiltered key is still cached, so the full list appears instantly
    // (SWR dedup: no redundant refetch), and the cleaned query never reaches
    // the port as an empty string.
    expect(await screen.findByText('Mike Hillyer')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(repository.getAll).not.toHaveBeenCalledWith({ search: '', active: undefined })
  })

  it('passes the status filter to the repository', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Mike Hillyer')

    await user.selectOptions(screen.getByLabelText('Status'), 'false')

    await waitFor(() =>
      expect(repository.getAll).toHaveBeenCalledWith({ search: undefined, active: false }),
    )
  })

  it('shows an error message when the list read fails', async () => {
    const repository = createRepository()
    repository.getAll.mockImplementationOnce(async () => {
      throw new ConflictError('Service unavailable.')
    })
    renderApp(repository)

    expect(await screen.findByText('Service unavailable.')).toBeInTheDocument()
  })
})

describe('App mutations', () => {
  it('creates a staff member through the service and refreshes the list', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Mike Hillyer')

    await user.click(screen.getByRole('button', { name: '+ New staff' }))
    await user.type(screen.getByLabelText('First name'), ' New ')
    await user.type(screen.getByLabelText('Last name'), 'Person')
    await user.type(screen.getByLabelText('Username'), 'nperson')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    // The service normalizes before the port is touched.
    await waitFor(() =>
      expect(repository.create).toHaveBeenCalledWith(
        {
          firstName: 'New',
          lastName: 'Person',
          email: null,
          addressId: 3,
          storeId: 1,
          username: 'nperson',
        },
        'secret123',
      ),
    )
    expect(await screen.findByText('New Person')).toBeInTheDocument()
  })

  it('edits a staff member through the service', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Mike Hillyer')

    const row = screen.getByText('Mike').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Edit' }))

    await user.clear(screen.getByLabelText('First name'))
    await user.type(screen.getByLabelText('First name'), 'Jonathan')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(repository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ firstName: 'Jonathan', username: 'Mike' }),
      ),
    )
    expect(await screen.findByText('Jonathan Hillyer')).toBeInTheDocument()
  })

  it('deactivates a staff member through the logical leave port', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Mike Hillyer')

    const row = screen.getByText('Mike').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(repository.setActive).toHaveBeenCalledWith(1, false))
  })

  it('changes a password through the dedicated use case', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Mike Hillyer')

    const row = screen.getByText('Mike').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Password' }))

    await user.type(screen.getByLabelText('New password'), 'newSecret9')
    await user.type(screen.getByLabelText('Confirm new password'), 'newSecret9')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => expect(repository.changePassword).toHaveBeenCalledWith(1, 'newSecret9'))
  })

  it('surfaces a domain conflict in the modal and keeps it open', async () => {
    const user = userEvent.setup()
    const repository = createRepository()
    repository.create.mockImplementationOnce(async () => {
      throw new ConflictError("Username 'Mike' is already in use.")
    })
    renderApp(repository)
    await screen.findByText('Mike Hillyer')

    await user.click(screen.getByRole('button', { name: '+ New staff' }))
    await user.type(screen.getByLabelText('First name'), 'Dup')
    await user.type(screen.getByLabelText('Last name'), 'User')
    await user.type(screen.getByLabelText('Username'), 'Mike')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText("Username 'Mike' is already in use.")).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /new staff member/i })).toBeInTheDocument()
  })

  it('reports a failed deactivate at page level (no modal open)', async () => {
    const user = userEvent.setup()
    const repository = createRepository()
    repository.setActive.mockImplementationOnce(async () => {
      throw new ConflictError('Cannot leave right now.')
    })
    renderApp(repository)
    await screen.findByText('Mike Hillyer')

    const row = screen.getByText('Mike').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByText('Cannot leave right now.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
