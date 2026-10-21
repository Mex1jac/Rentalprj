import { displayName, type Customer } from '../../domain/entities/customer'

interface CustomerListProps {
  customers: Customer[]
  loading: boolean
  onEdit: (member: Customer) => void
  onToggleActive: (member: Customer) => void
}

export function CustomerList({ customers, loading, onEdit, onToggleActive }: CustomerListProps) {
  if (loading) {
    return <p className="muted">Loading members...</p>
  }

  if (customers.length === 0) {
    return <p className="muted">No members found.</p>
  }

  // The wrapper contains horizontal scrolling to the table on small screens,
  // so the page itself never overflows the viewport.
  return (
    <div className="table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Store</th>
            <th>Status</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((member) => (
            <tr key={member.customerId} className={member.active ? '' : 'row-inactive'}>
              <td>{member.customerId}</td>
              <td>{displayName(member)}</td>
              <td>{member.email ?? '—'}</td>
              <td>{member.store}</td>
              <td>
                <span className={member.active ? 'badge badge-active' : 'badge badge-inactive'}>
                  {member.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="actions-col">
                <button type="button" className="btn btn-secondary" onClick={() => onEdit(member)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={member.active ? 'btn btn-danger' : 'btn btn-success'}
                  onClick={() => onToggleActive(member)}
                >
                  {member.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
