import { describe, expect, it } from 'vitest'
import { customerListKey } from '../../application/queries/customerQueries'
import { filmListKey } from '../../application/queries/filmQueries'
import { rentalListKey } from '../../application/queries/rentalQueries'

/**
 * One cache entry per page/size combination (rule client-swr-dedup): a slow
 * response for one page can never overwrite another page's slice, and the
 * rental-form dropdown (full list) never collides with the paged table.
 */
describe('list cache keys with pagination', () => {
  it('customer keys differ per page and per page size', () => {
    const base = { search: 'mary', active: true, page: 1, pageSize: 25 }

    expect(customerListKey(base)).not.toBe(customerListKey({ ...base, page: 2 }))
    expect(customerListKey(base)).not.toBe(customerListKey({ ...base, pageSize: 50 }))
    expect(customerListKey(base)).toBe(customerListKey({ ...base }))
  })

  it('customer keys distinguish the full list (dropdown) from paged keys', () => {
    expect(customerListKey({ active: true })).not.toBe(
      customerListKey({ active: true, page: 1, pageSize: 25 }),
    )
  })

  it('customer keys keep the filter parts in the same order', () => {
    expect(customerListKey({ search: 'mary', active: true, page: 1, pageSize: 10 })).toBe(
      'customer:list:["mary",true,1,10]',
    )
  })

  it('rental keys differ per page and status', () => {
    expect(rentalListKey({ status: 'open', page: 1, pageSize: 10 })).not.toBe(
      rentalListKey({ status: 'open', page: 2, pageSize: 10 }),
    )
    expect(rentalListKey({ status: 'open', page: 1, pageSize: 10 })).not.toBe(
      rentalListKey({ status: 'returned', page: 1, pageSize: 10 }),
    )
  })

  it('film keys differ per page, page size, search and status', () => {
    const base = { search: 'dino', status: 'all' as const, page: 1, pageSize: 25 }

    expect(filmListKey(base)).not.toBe(filmListKey({ ...base, page: 2 }))
    expect(filmListKey(base)).not.toBe(filmListKey({ ...base, pageSize: 50 }))
    expect(filmListKey(base)).not.toBe(filmListKey({ ...base, search: 'ace' }))
    expect(filmListKey(base)).not.toBe(filmListKey({ ...base, status: 'active' }))
    expect(filmListKey(base)).toBe(filmListKey({ ...base }))
  })

  it('film keys keep the filter parts in the same order', () => {
    expect(filmListKey({ search: 'dino', status: 'all', page: 2, pageSize: 50 })).toBe(
      'film:list:["dino","all",2,50]',
    )
  })
})
