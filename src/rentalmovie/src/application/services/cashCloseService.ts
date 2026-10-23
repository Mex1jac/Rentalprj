import { ValidationError } from '../../domain/errors/domainErrors'
import type { CashClosePeriod } from '../../domain/entities/cashClose'
import type { CashCloseQuery } from '../../domain/ports/cashCloseRepository'

/**
 * Mirrors the backend cash-close rules (CashCloseService.cs) so invalid
 * input fails fast with exactly the wording the API would return.
 */

/** Mirrors CashCloseService.MaxPeriodDays. */
export const MAX_CASH_CLOSE_DAYS = 366

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MONTH_PATTERN = /^\d{4}-\d{2}$/

/**
 * Resolves the picked calendar value into the inclusive day range the API
 * consumes: a day is [d, d]; a month is [first day, last day] (day 0 of the
 * next month is the last day of the selected one).
 */
export function resolveCashCloseRange(period: CashClosePeriod, value: string): CashCloseQuery {
  if (period === 'day') {
    if (!DAY_PATTERN.test(value)) {
      throw new ValidationError('Pick a date to see the report.')
    }
    return { from: value, to: value }
  }

  if (!MONTH_PATTERN.test(value)) {
    throw new ValidationError('Pick a month to see the report.')
  }
  const [year, month] = value.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    from: `${value}-01`,
    to: `${value}-${String(lastDay).padStart(2, '0')}`,
  }
}

/** Mirrors the range validation of CashCloseService.GetReportAsync. */
export function validateCashCloseRange({ from, to }: CashCloseQuery): void {
  // yyyy-MM-dd sorts lexicographically, so the comparison needs no parsing.
  if (from > to) {
    throw new ValidationError('From must be on or before To.')
  }
  if (dayNumber(to) - dayNumber(from) > MAX_CASH_CLOSE_DAYS) {
    throw new ValidationError(
      `The selected period cannot span more than ${MAX_CASH_CLOSE_DAYS} days.`,
    )
  }
}

/** Today in the operator's local time (never toISOString: that is UTC). */
export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Current month in yyyy-MM (calendar control default). */
export function currentMonthIso(): string {
  return todayIso().slice(0, 7)
}

/** Days since the epoch for a yyyy-MM-dd string (NaN-proofed by the pattern). */
function dayNumber(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}
