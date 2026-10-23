/**
 * Cash close (corte de caja) domain types — mirror of CashCloseDto.cs:
 * what the report of one period contains.
 */

/** Granularity offered by the calendar control: a single day or a whole month. */
export type CashClosePeriod = 'day' | 'month'

/** Per-film row of the cash-close summary. */
export interface CashCloseFilm {
  filmId: number
  title: string
  /** Rentals of this film started inside the period. */
  rentals: number
  /** Subset of `rentals` with no return yet. */
  openRentals: number
  /** Sum of the payments recorded for those rentals, in USD. */
  amount: number
}

/** Report of an inclusive day range: totals plus the per-film breakdown. */
export interface CashCloseReport {
  /** Inclusive bounds of the report, yyyy-MM-dd. */
  from: string
  to: string
  rentals: number
  openRentals: number
  returnedRentals: number
  distinctFilms: number
  amount: number
  films: CashCloseFilm[]
}
