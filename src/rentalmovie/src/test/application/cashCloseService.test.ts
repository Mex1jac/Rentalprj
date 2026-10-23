import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../domain/errors/domainErrors'
import {
  MAX_CASH_CLOSE_DAYS,
  currentMonthIso,
  resolveCashCloseRange,
  todayIso,
  validateCashCloseRange,
} from '../../application/services/cashCloseService'

/**
 * The calendar control hands the picked value (a day or a month) to the
 * service, which resolves it into the inclusive range the API consumes and
 * mirrors the backend validation wording (CashCloseService.cs).
 */
describe('resolveCashCloseRange', () => {
  it('maps a day to a single-day range', () => {
    expect(resolveCashCloseRange('day', '2026-10-22')).toEqual({
      from: '2026-10-22',
      to: '2026-10-22',
    })
  })

  it('maps a month to its first and last day', () => {
    expect(resolveCashCloseRange('month', '2026-10')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })
    expect(resolveCashCloseRange('month', '2026-02')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('uses 29 days for February of a leap year', () => {
    expect(resolveCashCloseRange('month', '2024-02')).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    })
  })

  it('rejects a cleared or malformed day value', () => {
    expect(() => resolveCashCloseRange('day', '')).toThrow(ValidationError)
    expect(() => resolveCashCloseRange('day', '22/10/2026')).toThrow(
      'Pick a date to see the report.',
    )
  })

  it('rejects a cleared or malformed month value', () => {
    expect(() => resolveCashCloseRange('month', '')).toThrow(
      'Pick a month to see the report.',
    )
  })
})

describe('validateCashCloseRange (mirror of CashCloseService.cs)', () => {
  it('rejects From after To with the backend wording', () => {
    expect(() => validateCashCloseRange({ from: '2026-10-22', to: '2026-10-21' })).toThrow(
      'From must be on or before To.',
    )
  })

  it('rejects periods longer than the backend cap', () => {
    // 367 days apart (2024 is a leap year): beyond MaxPeriodDays = 366.
    expect(() => validateCashCloseRange({ from: '2024-01-01', to: '2025-01-02' })).toThrow(
      'The selected period cannot span more than 366 days.',
    )
  })

  it('accepts exactly the cap and any single day', () => {
    expect(() => validateCashCloseRange({ from: '2024-01-01', to: '2025-01-01' })).not.toThrow()
    expect(() => validateCashCloseRange({ from: '2026-10-22', to: '2026-10-22' })).not.toThrow()
  })

  it('keeps the same cap as the backend constant', () => {
    expect(MAX_CASH_CLOSE_DAYS).toBe(366)
  })
})

describe('calendar defaults', () => {
  it('todayIso is the local calendar day in yyyy-MM-dd', () => {
    // toISOString would be UTC and could point at yesterday after midnight.
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`

    expect(todayIso()).toBe(expected)
  })

  it('currentMonthIso is today truncated to yyyy-MM', () => {
    expect(currentMonthIso()).toBe(todayIso().slice(0, 7))
    expect(currentMonthIso()).toMatch(/^\d{4}-\d{2}$/)
  })
})
