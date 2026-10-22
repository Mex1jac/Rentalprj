import { useState, type FormEvent } from 'react'
import type { RentalFormValues } from '../../application/dtos/rentalDtos'
import type { Customer } from '../../domain/entities/customer'
import type { FilmOption, StoreOption } from '../../domain/entities/lookup'
import type { Staff } from '../../domain/entities/staff'

const DEFAULT_RENTAL_DAYS = 6

interface RentalCreateFormProps {
  customers: Customer[]
  staff: Staff[]
  stores: StoreOption[]
  /** Films stocked at the currently selected store (with available copies). */
  films: FilmOption[]
  filmsLoading: boolean
  /** The store selection is lifted so the parent can fetch its films. */
  storeId: string
  onStoreChange: (storeId: string) => void
  saving: boolean
  error: string | null
  // Raw values are forwarded as typed: normalization and validation belong to
  // the rental service (application layer), not to the UI.
  onSave: (values: RentalFormValues) => void
  onCancel: () => void
}

export function RentalCreateForm({
  customers,
  staff,
  stores,
  films,
  filmsLoading,
  storeId,
  onStoreChange,
  saving,
  error,
  onSave,
  onCancel,
}: RentalCreateFormProps) {
  const [customerId, setCustomerId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [selection, setSelection] = useState<ReadonlySet<number>>(new Set())
  const [filmFilter, setFilmFilter] = useState('')
  // Until the operator types, the days field shows the suggestion derived
  // from the selected films (derived during render: no effect involved).
  const [daysTouched, setDaysTouched] = useState(false)
  const [daysInput, setDaysInput] = useState('')

  // Derived state: selection validity is always checked against the films of
  // the currently selected store.
  const selectedFilms = films.filter((film) => selection.has(film.filmId))
  const suggestedDays = selectedFilms[0]?.rentalDurationDays ?? DEFAULT_RENTAL_DAYS
  const daysValue = daysTouched ? daysInput : String(suggestedDays)
  const filter = filmFilter.trim().toLowerCase()
  const visibleFilms = films
    .filter((film) => film.availableCopies > 0)
    .filter((film) => filter === '' || film.title.toLowerCase().includes(filter))

  function handleStoreChange(value: string) {
    // The film list belongs to the store: start with a clean selection.
    setSelection(new Set())
    setFilmFilter('')
    onStoreChange(value)
  }

  function toggleFilm(filmId: number) {
    setSelection((previous) => {
      const next = new Set(previous)
      if (next.has(filmId)) {
        next.delete(filmId)
      } else {
        next.add(filmId)
      }
      return next
    })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave({
      customerId,
      staffId,
      storeId,
      rentalDays: daysValue,
      // Only films of the current store travel: stale ids are impossible.
      filmIds: films.filter((film) => selection.has(film.filmId)).map((film) => String(film.filmId)),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rental-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="rental-form-title">New rental</h2>

        {error ? <p className="error-message">{error}</p> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              Customer
              <select
                name="customerId"
                required
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Select a member…</option>
                {customers.map((customer) => (
                  <option key={customer.customerId} value={customer.customerId}>
                    {`${customer.firstName} ${customer.lastName}`}
                    {customer.email ? ` — ${customer.email}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Staff member
              <select name="staffId" required value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                <option value="">Select a staff member…</option>
                {staff.map((member) => (
                  <option key={member.staffId} value={member.staffId}>
                    {`${member.firstName} ${member.lastName}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Store
              <select name="storeId" required value={storeId} onChange={(event) => handleStoreChange(event.target.value)}>
                <option value="">Select a store…</option>
                {stores.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.display}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rental days
              <input
                type="number"
                name="rentalDays"
                min={1}
                max={90}
                required
                value={daysValue}
                onChange={(event) => {
                  setDaysTouched(true)
                  setDaysInput(event.target.value)
                }}
              />
              {selectedFilms.length > 0 && !daysTouched ? (
                <small className="muted">Suggested: {suggestedDays} days (film default).</small>
              ) : null}
            </label>
          </div>

          <label htmlFor="film-filter">Films</label>
          <input
            id="film-filter"
            type="search"
            name="filmFilter"
            autoComplete="off"
            placeholder="Filter by title…"
            value={filmFilter}
            onChange={(event) => setFilmFilter(event.target.value)}
          />

          {storeId === '' ? (
            <p className="muted">Select a store to list its available films.</p>
          ) : filmsLoading ? (
            <p className="muted">Loading films…</p>
          ) : visibleFilms.length === 0 ? (
            <p className="muted">No films match this filter.</p>
          ) : (
            <div className="film-picker">
              {visibleFilms.map((film) => (
                <label key={film.filmId} className="film-option">
                  <input
                    type="checkbox"
                    name="filmIds"
                    value={film.filmId}
                    checked={selection.has(film.filmId)}
                    onChange={() => toggleFilm(film.filmId)}
                  />
                  <span>{film.title}</span>
                  <span className="film-meta">
                    {film.availableCopies} avail. · {film.rentalRate.toFixed(2)} · {film.rentalDurationDays}d
                  </span>
                </label>
              ))}
            </div>
          )}

          <p className="muted" aria-live="polite">
            {selectedFilms.length} film(s) selected · {daysValue} day(s)
          </p>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : `Rent ${selectedFilms.length} film(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
