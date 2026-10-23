import useSWR from 'swr'
import { type CashCloseReport } from '../../domain/entities/cashClose'
import type { CashCloseQuery, CashCloseRepository } from '../../domain/ports/cashCloseRepository'
import { validateCashCloseRange } from '../services/cashCloseService'

/** Prefix shared by every cash-close key, used for scoped revalidation. */
export const CASH_CLOSE_KEY_PREFIX = 'cashclose:'

/**
 * Stable cache key for one period (rule client-swr-dedup): a slow response
 * for an older range can never overwrite a newer one. The key is derived from
 * the query only — transport details (URLs) belong to the repository adapter.
 */
export function cashCloseKey(query: CashCloseQuery): string {
  return `${CASH_CLOSE_KEY_PREFIX}${JSON.stringify([query.from, query.to])}`
}

export interface CashCloseResult {
  /** Current report (blank until the first response arrives). */
  report: CashCloseReport
  error: unknown
  isLoading: boolean
  /** True while a new period loads; the previous report stays visible. */
  isValidating: boolean
  /** False while no period is selected (cleared input): nothing to fetch. */
  enabled: boolean
}

const BLANK_REPORT: CashCloseReport = {
  from: '',
  to: '',
  rentals: 0,
  openRentals: 0,
  returnedRentals: 0,
  distinctFilms: 0,
  amount: 0,
  films: [],
}

/** Read use case: cached, deduplicated cash-close report (SWR). */
export function useCashClose(
  repository: CashCloseRepository,
  query: CashCloseQuery | null,
): CashCloseResult {
  const { data, error, isLoading, isValidating } = useSWR(
    // Falsy key = no period picked: the hook stays mounted, nothing fetches.
    query ? cashCloseKey(query) : null,
    () => {
      validateCashCloseRange(query as CashCloseQuery)
      return repository.getReport(query as CashCloseQuery)
    },
    // Keep the previous report visible while the next one loads (no blank flash).
    { keepPreviousData: true },
  )
  return {
    report: data ?? (query ? { ...BLANK_REPORT, ...query } : BLANK_REPORT),
    error,
    isLoading,
    isValidating,
    enabled: query !== null,
  }
}
