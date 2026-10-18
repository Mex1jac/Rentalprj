import type { Staff } from '../types'

interface StaffListProps {
  staff: Staff[]
  loading: boolean
  onEdit: (staff: Staff) => void
  onChangePassword: (staff: Staff) => void
  onToggleActive: (staff: Staff) => void
}

export function StaffList({ staff, loading, onEdit, onChangePassword, onToggleActive }: StaffListProps) {
  if (loading) {
    return <p className="muted">Loading staff...</p>
  }

  if (staff.length === 0) {
    return <p className="muted">No staff members found.</p>
  }

  return (
    <table className="staff-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Username</th>
          <th>Email</th>
          <th>Store</th>
          <th>Status</th>
          <th className="actions-col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {staff.map((member) => (
          <tr key={member.staffId} className={member.active ? '' : 'row-inactive'}>
            <td>{member.staffId}</td>
            <td>
              {member.firstName} {member.lastName}
            </td>
            <td>{member.username}</td>
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
              <button type="button" className="btn btn-secondary" onClick={() => onChangePassword(member)}>
                Password
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
  )
}
