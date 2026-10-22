import type { Film } from '../../domain/entities/film'

interface FilmListProps {
  films: Film[]
  loading: boolean
  /** Row whose delete is awaiting confirmation (in-row two-step confirm). */
  confirmingFilmId: number | null
  onEdit: (film: Film) => void
  /** First delete click: arms the confirm state for that row. */
  onDelete: (film: Film) => void
  /** Second delete click: performs the physical delete. */
  onConfirmDelete: (film: Film) => void
  onCancelConfirm: () => void
}

export function FilmList({
  films,
  loading,
  confirmingFilmId,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelConfirm,
}: FilmListProps) {
  if (loading) {
    return <p className="muted">Loading films…</p>
  }

  if (films.length === 0) {
    return <p className="muted">No films found.</p>
  }

  // The wrapper contains horizontal scrolling to the table on small screens,
  // so the page itself never overflows the viewport.
  return (
    <div className="table-scroll">
      <table className="staff-table films-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Rating</th>
            <th>Rate</th>
            <th>Replacement</th>
            <th>Days</th>
            <th>Language</th>
            <th>Copies</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {films.map((film) => (
            <tr key={film.filmId}>
              <td>{film.filmId}</td>
              <td className="cell-name">{film.title}</td>
              <td>
                <span className="badge badge-rating">{film.rating}</span>
              </td>
              <td className="cell-num">{film.rentalRate.toFixed(2)}</td>
              <td className="cell-num">{film.replacementCost.toFixed(2)}</td>
              <td className="cell-num">{film.rentalDurationDays}</td>
              <td>{film.language}</td>
              <td className="cell-num">{film.totalCopies}</td>
              <td className="actions-col">
                <button type="button" className="btn btn-secondary" onClick={() => onEdit(film)}>
                  Edit
                </button>
                {confirmingFilmId === film.filmId ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onConfirmDelete(film)}
                    >
                      Confirm delete
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onCancelConfirm}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-danger" onClick={() => onDelete(film)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
