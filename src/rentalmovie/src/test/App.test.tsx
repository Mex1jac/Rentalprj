import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import type { Staff } from '../types'

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

/** Route-aware fetch mock: every request is recorded for assertions. */
const fetchCalls: Array<{ url: string; method: string; body: unknown }> = []

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(init.body as string) : undefined
      fetchCalls.push({ url, method, body })

      const respond = (payload: unknown, status = 200) => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
      })

      if (url.includes('/api/staff') && method === 'GET') {
        const search = new URL(url).searchParams.get('search')
        let rows = staffRows
        if (search) {
          rows = rows.filter((row) => row.username.toLowerCase().includes(search.toLowerCase()))
        }
        return respond(rows)
      }
      if (url.includes('/api/lookups/addresses')) {
        return respond(addresses)
      }
      if (url.includes('/api/lookups/stores')) {
        return respond(stores)
      }
      if (url.includes('/api/staff') && method === 'POST') {
        const created: Staff = {
          ...mike,
          staffId: 9,
          firstName: body.firstName,
          lastName: body.lastName,
          username: body.username,
          email: body.email,
        }
        staffRows = [...staffRows, created]
        return respond(created, 201)
      }
      if (url.includes('/active') && method === 'PUT') {
        const id = Number(url.match(/\/api\/staff\/(\d+)/)?.[1])
        staffRows = staffRows.map((row) => (row.staffId === id ? { ...row, active: body.active } : row))
        return respond({ staffId: id, active: body.active })
      }
      if (url.includes('/password') && method === 'PUT') {
        return respond(null, 204)
      }
      if (url.includes('/api/staff/') && method === 'PUT') {
        const id = Number(url.match(/\/api\/staff\/(\d+)/)?.[1])
        staffRows = staffRows.map((row) => (row.staffId === id ? { ...row, ...body } : row))
        return respond({ ...staffRows.find((row) => row.staffId === id) })
      }
      return respond({ error: 'not found' }, 404)
    }),
  )
}

function renderApp() {
  // A fresh cache provider per render keeps tests isolated (rule client-swr-dedup).
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <App />
    </SWRConfig>,
  )
}

beforeEach(() => {
  staffRows = [mike, jon]
  fetchCalls.length = 0
  mockFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App staff list', () => {
  it('loads and renders the staff rows', async () => {
    renderApp()

    expect(await screen.findByText('Mike Hillyer')).toBeInTheDocument()
    expect(screen.getByText('Jon Stephens')).toBeInTheDocument()
    // Scope to the table: the status <select> also contains an "Active" option.
    expect(within(screen.getByRole('table')).getAllByText('Active')).toHaveLength(2)
  })

  it('deduplicates the initial request: lookups and list fetched once each', async () => {
    renderApp()
    await screen.findByText('Mike Hillyer')

    await waitFor(() => expect(fetchCalls.some((call) => call.url.includes('/api/lookups/stores'))))
    const listCalls = fetchCalls.filter((call) => call.url.includes('/api/staff?') || call.url.endsWith('/api/staff'))
    expect(listCalls).toHaveLength(1)
  })

  it('sends the deferred search term to the API', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Mike Hillyer')

    await user.type(screen.getByLabelText('Search'), 'jon')

    await waitFor(() =>
      expect(fetchCalls.some((call) => call.url.includes('search=jon'))).toBe(true),
    )
  })

  it('filters by status using the active query param', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Mike Hillyer')

    await user.selectOptions(screen.getByLabelText('Status'), 'false')

    await waitFor(() =>
      expect(fetchCalls.some((call) => call.url.includes('active=false'))).toBe(true),
    )
  })
})

describe('App mutations', () => {
  it('creates a staff member and revalidates the list', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Mike Hillyer')

    await user.click(screen.getByRole('button', { name: '+ New staff' }))
    await user.type(screen.getByLabelText('First name'), 'New')
    await user.type(screen.getByLabelText('Last name'), 'Person')
    await user.type(screen.getByLabelText('Username'), 'nperson')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      const post = fetchCalls.find((call) => call.method === 'POST')
      expect(post?.body).toMatchObject({ username: 'nperson', password: 'secret123' })
    })
    expect(await screen.findByText('New Person')).toBeInTheDocument()
  })

  it('deactivates a staff member through the logical leave endpoint', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Mike Hillyer')

    const row = screen.getByText('Mike').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => {
      const put = fetchCalls.find((call) => call.url.includes('/active') && call.method === 'PUT')
      expect(put?.body).toEqual({ active: false })
    })
  })

  it('changes a password via the dedicated endpoint', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Mike Hillyer')

    const row = screen.getByText('Mike').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Password' }))

    await user.type(screen.getByLabelText('New password'), 'newSecret9')
    await user.type(screen.getByLabelText('Confirm new password'), 'newSecret9')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => {
      const put = fetchCalls.find((call) => call.url.includes('/password') && call.method === 'PUT')
      expect(put?.body).toEqual({ newPassword: 'newSecret9' })
    })
  })

  it('surfaces a 409 conflict from the server in the modal', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Mike Hillyer')

    // Make the next POST conflict.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body })
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: "Username 'Mike' is already in use." }),
        }
      }),
    )

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
})
