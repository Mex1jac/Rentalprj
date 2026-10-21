import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Customer } from '../../domain/entities/customer'
import { ConflictError } from '../../domain/errors/domainErrors'
import { customerApiRepository } from '../../infrastructure/persistence/customerApiRepository'

const customerRow: Customer = {
  customerId: 10,
  firstName: 'Mary',
  lastName: 'Smith',
  email: null,
  addressId: 3,
  address: '23 Workhaven Lane',
  storeId: 1,
  store: 'Store 1',
  active: true,
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

describe('customerApiRepository', () => {
  it('getAll with no filters requests /api/customers', async () => {
    const fetchMock = stubFetch([])

    await customerApiRepository.getAll({})

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5174/api/customers', expect.anything())
  })

  it('getAll encodes the search and status filters', async () => {
    const fetchMock = stubFetch([])

    await customerApiRepository.getAll({ search: 'mary', active: true })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5174/api/customers?search=mary&active=true',
      expect.anything(),
    )
  })

  it('create posts the normalized data exactly once', async () => {
    const fetchMock = stubFetch(customerRow, 201)

    await customerApiRepository.create({
      firstName: 'Mary',
      lastName: 'Smith',
      email: null,
      addressId: 3,
      storeId: 1,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/customers')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      firstName: 'Mary',
      lastName: 'Smith',
      email: null,
      addressId: 3,
      storeId: 1,
    })
  })

  it('update uses the customer-specific URL', async () => {
    const fetchMock = stubFetch(customerRow)

    await customerApiRepository.update(10, {
      firstName: 'Mary',
      lastName: 'Smith',
      email: 'mary@example.com',
      addressId: 3,
      storeId: 1,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/customers/10')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({
      firstName: 'Mary',
      lastName: 'Smith',
      email: 'mary@example.com',
      addressId: 3,
      storeId: 1,
    })
  })

  it('setActive uses the logical-leave endpoint', async () => {
    const fetchMock = stubFetch({ customerId: 10, active: false })

    await customerApiRepository.setActive(10, false)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/customers/10/active')
    expect(JSON.parse(init.body)).toEqual({ active: false })
  })

  it('translates a 409 conflict into a domain ConflictError', async () => {
    stubFetch({ error: 'Customer with id 10 has 2 open rentals and cannot be deactivated.' }, 409)

    const error = await customerApiRepository.setActive(10, false).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).message).toBe(
      'Customer with id 10 has 2 open rentals and cannot be deactivated.',
    )
  })
})
