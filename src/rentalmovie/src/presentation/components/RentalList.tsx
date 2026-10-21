import type { Rental } from '../../domain/entities/rental'
import { isOpen } from '../../domain/entities/rental'
import { formatDate } from '../formatDate'

interface RentalListProps {
  rentals: Rental[]
  loading: boolean
  onReturn: (rental: Rental) => void
}

export function RentalList({ rentals, loading, onReturn }: RentalListProps) {
  if (loading) {
    return <p className="muted">Loading rentals...</p>
  }

  if (rentals.length === 0) {
    return <p className="muted">No rentals found.</p>
  }

  // The wrapper contains horizontal scrolling to the table on small screens,
  // so the page itself never overflows the viewport.
  return (
    <div className="table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Film</th>
            <th>Store</th>
            <th>Rented</th>
            <th>Due</th>
            <th>Status</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((rental) => (
            <tr key={rental.rentalId}>
              <td>{rental.rentalId}</td>
              <td>{rental.customer}</td>
              <td>{rental.filmTitle}</td>
              <td>{rental.store}</td>
              <td>{formatDate(rental.rentalDate)}</td>
              <td className={rental.overdue ? 'cell-overdue' : undefined}>{formatDate(rental.dueDate)}</td>
              <td>
                {rental.overdue ? (
                  <span className="badge badge-overdue">Overdue</span>
                ) : isOpen(rental) ? (
                  <span className="badge badge-active">Open</span>
                ) : (
                  <span className="badge badge-returned">Returned</span>
                )}
              </td>
              <td className="actions-col">
                {isOpen(rental) ? (
                  <button type="button" className="btn btn-success" onClick={() => onReturn(rental)}>
                    Return
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
