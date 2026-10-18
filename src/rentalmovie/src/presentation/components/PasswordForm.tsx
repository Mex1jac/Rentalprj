import { useState, type FormEvent } from 'react'
import type { Staff } from '../../domain/entities/staff'

interface PasswordFormProps {
  staff: Staff
  saving: boolean
  error: string | null
  onSave: (newPassword: string) => void
  onCancel: () => void
}

/**
 * Change-password dialog. The current password is never loaded nor displayed
 * (the API does not expose it); only a masked indicator is shown.
 */
export function PasswordForm({ staff, saving, error, onSave, onCancel }: PasswordFormProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    // UX guard only: the service validates length again before sending.
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    setLocalError(null)
    onSave(newPassword)
  }

  const displayedError = localError ?? error

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="password-form-title">Change password — {staff.username}</h2>

        <p className="muted">
          Current password: <span className="masked-value">••••••••</span> (hidden, never returned by the
          API)
        </p>

        {displayedError ? <p className="error-message">{displayedError}</p> : null}

        <form onSubmit={handleSubmit}>
          <label htmlFor="password-new">New password</label>
          <div className="password-field">
            <input
              id="password-new"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              maxLength={128}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <label htmlFor="password-confirm">Confirm new password</label>
          <input
            id="password-confirm"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            maxLength={128}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
