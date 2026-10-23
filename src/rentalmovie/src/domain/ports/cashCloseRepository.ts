import type { CashCloseReport } from '../entities/cashClose'

/** Inclusive day range consumed by the API (yyyy-MM-dd on both ends). */
export interface CashCloseQuery {
  from: string
  to: string
}

/**
 * Persistence port for the cash-close report (mirrors
 * ICashCloseRepository.cs): one report per period, totals included.
 */
export interface CashCloseRepository {
  getReport(query: CashCloseQuery): Promise<CashCloseReport>
}
