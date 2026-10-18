import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Staff } from '../../domain/entities/staff'
import { ConflictError } from '../../domain/errors/domainErrors'
import { staffApiRepository } from '../../infrastructure/persistence/staffApiRepository'

const staffRow: Staff = {
  staffId: 7,
  firstName: 'Jane',
  lastName: 'Smith',
  email: null,
  addressId: 3,
  address: '23 Workhaven Lane',
  storeId: 1,
  store: 'Store 1',
  active: true,
  username: 'jsmith',
}

/** Transport seam: the repository is tested against a stubbed fetch. */
function stubFetch(payload: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('staffApiRepository', () => {
  it('getAll with no filters requests /api/staff', async () => {
    const fetchMock = stubFetch([])

    await staffApiRepository.getAll({})

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5174/api/staff', expect.anything())
  })

  it('getAll encodes the search and status filters', async () => {
    const fetchMock = stubFetch([])

    await staffApiRepository.getAll({ search: 'john doe', active: true })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5174/api/staff?search=john+doe&active=true',
      expect.anything(),
    )
  })

  it('create posts the data plus the clear password exactly once', async () => {
    const fetchMock = stubFetch(staffRow, 201)

    await staffApiRepository.create(
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: null,
        addressId: 3,
        storeId: 1,
        username: 'jsmith',
      },
      'secret123',
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/staff')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      email: null,
      addressId: 3,
      storeId: 1,
      username: 'jsmith',
      password: 'secret123',
    })
  })

  it('update never includes a password field', async () => {
    const fetchMock = stubFetch(staffRow)

    await staffApiRepository.update(7, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: null,
      addressId: 3,
      storeId: 1,
      username: 'jsmith',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/staff/7')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).not.toHaveProperty('password')
  })

  it('changePassword uses the dedicated endpoint', async () => {
    const fetchMock = stubFetch(null, 204)

    await staffApiRepository.changePassword(7, 'secret123')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/staff/7/password')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ newPassword: 'secret123' })
  })

  it('setActive uses the logical-leave endpoint', async () => {
    const fetchMock = stubFetch({ staffId: 7, active: false })

    await staffApiRepository.setActive(7, false)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/staff/7/active')
    expect(JSON.parse(init.body)).toEqual({ active: false })
  })

  it('translates a 409 conflict into a domain ConflictError', async () => {
    stubFetch({ error: "Username 'jsmith' is already in use." }, 409)

    const error = await staffApiRepository
      .create(
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: null,
          addressId: 3,
          storeId: 1,
          username: 'jsmith',
        },
        'secret123',
      )
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).message).toBe("Username 'jsmith' is already in use.")
  })
})
