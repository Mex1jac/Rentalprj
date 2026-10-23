import { useMemo, useState } from 'react'
import { useCashClose } from '../../application/queries/cashCloseQueries'
import {
  currentMonthIso,
  resolveCashCloseRange,
  todayIso,
} from '../../application/services/cashCloseService'
import type { CashClosePeriod } from '../../domain/entities/cashClose'
import type { CashCloseQuery, CashCloseRepository } from '../../domain/ports/cashCloseRepository'
import { errorMessage } from '../errorMessage'
import { formatUsd } from '../formatUsd'

interface CashCloseViewProps {
  cashCloseRepository: CashCloseRepository
}

/** Local date for a yyyy-MM-dd string (never new Date(iso): that parses UTC). */
function dayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString()
}

function rangeLabel({ from, to }: CashCloseQuery): string {
  return from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`
}

/**
 * Cash close section (corte de caja): the films rented in the selected
 * period — one day or one whole month via the native calendar controls — and
 * the money those rentals generated.
 */
export function CashCloseView({ cashCloseRepository }: CashCloseViewProps) {
  const [period, setPeriod] = useState<CashClosePeriod>('day')
  const [dayValue, setDayValue] = useState(todayIso)
  const [monthValue, setMonthValue] = useState(currentMonthIso)

  // Cleared inputs produce '' (native controls only allow '' or a valid
  // format): no range to query, so the view asks for a pick instead.
  const range = useMemo(() => {
    const value = period === 'day' ? dayValue : monthValue
    if (value === '') {
      return null
    }
    try {
      return resolveCashCloseRange(period, value)
    } catch {
      return null
    }
  }, [period, dayValue, monthValue])

  // One cache entry per range (rule client-swr-dedup).
  const { report, error, isLoading, isValidating, enabled } = useCashClose(
    cashCloseRepository,
    range,
  )

  const pageError = error ? errorMessage(error) : null
  const showLoading = enabled && isLoading && report.films.length === 0

  return (
    <section className="view" aria-label="Cash close">
      <header className="hero">
        <p className="eyebrow">Cash register</p>
        <div className="hero-heading">
          <h2>Cash close</h2>
          <span className="count-badge">{report.rentals}</span>
        </div>
        <div className="hero-bottom">
          <p className="hero-description">
            The films rented in the selected period and the money each one generated: pick a
            single day or a whole month.
          </p>
        </div>
      </header>

      <section className="filters">
        <label>
          Period
          <select
            name="period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as CashClosePeriod)}
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
          </select>
        </label>
        <label>
          {period === 'day' ? 'Date' : 'Month'}
          {period === 'day' ? (
            <input
              type="date"
              name="day"
              value={dayValue}
              onChange={(event) => setDayValue(event.target.value)}
            />
          ) : (
            <input
              type="month"
              name="month"
              value={monthValue}
              onChange={(event) => setMonthValue(event.target.value)}
            />
          )}
        </label>
        {pageError ? <p className="error-message">{pageError}</p> : null}
        <p className="toolbar-count">{range ? rangeLabel(range) : 'Pick a date'}</p>
      </section>

      <div
        className={isValidating ? 'results results-end results-stale' : 'results results-end'}
        aria-busy={isValidating}
      >
        {/* Totals strip inside the card, above the per-film breakdown. */}
        <div className="cash-totals" aria-live="polite">
          <div className="stat-tile">
            <span className="stat-label">Rentals</span>
            <strong className="stat-value">{report.rentals}</strong>
            <span className="stat-sub">
              {report.openRentals} on rent · {report.returnedRentals} returned
            </span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Films</span>
            <strong className="stat-value">{report.distinctFilms}</strong>
            <span className="stat-sub">titles rented in the period</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Generated</span>
            <strong className="stat-value">{formatUsd(report.amount)}</strong>
            <span className="stat-sub">payments recorded in the period</span>
          </div>
        </div>

        {!enabled ? (
          <p className="muted">Pick a date to see the report.</p>
        ) : showLoading ? (
          <p className="muted">Loading cash close…</p>
        ) : report.films.length === 0 ? (
          // The error itself lives in the toolbar; without rows there is
          // nothing to tabulate, so never render an empty table.
          <p className="muted">
            {pageError ? 'No report to show.' : 'No rentals started in this period.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Film</th>
                  <th className="cell-num">Rentals</th>
                  <th className="cell-num">Still on rent</th>
                  <th className="cell-num">Generated</th>
                </tr>
              </thead>
              <tbody>
                {report.films.map((film) => (
                  <tr key={film.filmId}>
                    <td className="cell-name">{film.title}</td>
                    <td className="cell-num">{film.rentals}</td>
                    <td className="cell-num">{film.openRentals}</td>
                    <td className="cell-num">{formatUsd(film.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
