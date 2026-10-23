import type { CashCloseReport } from '../../domain/entities/cashClose'
import type { CashCloseQuery, CashCloseRepository } from '../../domain/ports/cashCloseRepository'
import { mapApiError } from '../http/errorMapper'
import { api } from '../http/httpClient'

/**
 * HTTP adapter for the cash-close port: builds the exact URLs consumed by
 * RentalApp.Api and translates transport failures into domain errors.
 */
export const cashCloseApiRepository: CashCloseRepository = {
  async getReport(query: CashCloseQuery) {
    try {
      const params = new URLSearchParams({ from: query.from, to: query.to })
      return await api.get<CashCloseReport>(`/api/cashclose?${params.toString()}`)
    } catch (error) {
      throw mapApiError(error)
    }
  },
}
