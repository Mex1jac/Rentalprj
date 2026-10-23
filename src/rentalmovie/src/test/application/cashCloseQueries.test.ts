import { describe, expect, it } from 'vitest'
import { cashCloseKey } from '../../application/queries/cashCloseQueries'

/**
 * One cache entry per period (rule client-swr-dedup): a slow response for an
 * older range can never overwrite a newer one, and a cleared input (null key)
 * never produces a cache entry at all.
 */
describe('cash-close cache key', () => {
  it('has one entry per range combination', () => {
    const day = { from: '2026-10-22', to: '2026-10-22' }

    expect(cashCloseKey(day)).not.toBe(cashCloseKey({ from: '2026-10-21', to: '2026-10-21' }))
    expect(cashCloseKey(day)).not.toBe(cashCloseKey({ from: '2026-10-01', to: '2026-10-31' }))
    expect(cashCloseKey(day)).not.toBe(cashCloseKey({ from: '2026-10-22', to: '2026-10-31' }))
    expect(cashCloseKey(day)).toBe(cashCloseKey({ from: '2026-10-22', to: '2026-10-22' }))
  })

  it('stays under its own prefix so it never collides with other lists', () => {
    expect(cashCloseKey({ from: '2026-10-22', to: '2026-10-22' })).toMatch(/^cashclose:/)
  })
})
