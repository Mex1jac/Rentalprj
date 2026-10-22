import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Rental } from '../../domain/entities/rental'
import { ConflictError } from '../../domain/errors/domainErrors'
import { rentalApiRepository } from '../../infrastructure/persistence/rentalApiRepository'

const rentalRow: Rental = {
  rentalId: 101,
  rentalDate: '2026-10-20T10:00:00',
  dueDate: '2026-10-23T10:00:00',
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

describe('rentalApiRepository', () => {
  it('list always sends the status filter (defaults to open)', async () => {
    const fetchMock = stubFetch({ items: [], page: 1, pageSize: 0, total: 0, totalPages: 1 })

    await rentalApiRepository.list({ status: 'open' })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5174/api/rentals?status=open', expect.anything())
  })

  it('list encodes the search, status and pagination params', async () => {
    const fetchMock = stubFetch({ items: [], page: 3, pageSize: 50, total: 0, totalPages: 1 })

    const result = await rentalApiRepository.list({
      search: 'mary',
      status: 'returned',
      page: 3,
      pageSize: 50,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5174/api/rentals?search=mary&status=returned&page=3&pageSize=50',
      expect.anything(),
    )
    expect(result).toEqual({ items: [], page: 3, pageSize: 50, total: 0, totalPages: 1 })
  })

  it('create posts the batch payload and returns the created rows', async () => {
    const fetchMock = stubFetch([rentalRow], 201)

    const created = await rentalApiRepository.create({
      customerId: 10,
      staffId: 1,
      storeId: 1,
      rentalDays: 3,
      filmIds: [1, 2],
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/rentals')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      customerId: 10,
      staffId: 1,
      storeId: 1,
      rentalDays: 3,
      filmIds: [1, 2],
    })
    expect(created).toHaveLength(1)
    expect(created[0].filmTitle).toBe('ACADEMY DINOSAUR')
  })

  it('markReturned uses the dedicated return endpoint', async () => {
    const fetchMock = stubFetch({ ...rentalRow, returnDate: '2026-10-21T09:00:00' })

    const returned = await rentalApiRepository.markReturned(101)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/rentals/101/return')
    expect(init.method).toBe('PUT')
    expect(returned.returnDate).not.toBeNull()
  })

  it('translates a 409 conflict into a domain ConflictError', async () => {
    stubFetch({ error: 'Rental with id 101 was already returned.' }, 409)

    const error = await rentalApiRepository.markReturned(101).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).message).toBe('Rental with id 101 was already returned.')
  })
})
