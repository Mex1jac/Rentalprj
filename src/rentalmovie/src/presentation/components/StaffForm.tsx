import { useState, type FormEvent } from 'react'
import type { StaffFormValues } from '../../application/dtos/staffDtos'
import type { AddressOption, StoreOption } from '../../domain/entities/lookup'
import type { Staff } from '../../domain/entities/staff'

interface StaffFormProps {
  // null means "create mode"; an existing staff means "edit mode".
  staff: Staff | null
  addresses: AddressOption[]
  stores: StoreOption[]
  saving: boolean
  error: string | null
  // Raw values are forwarded as typed: normalization and validation belong to
  // the staff service (application layer), not to the UI.
  onSave: (values: StaffFormValues) => void
  onCancel: () => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  addressId: string
  storeId: string
  username: string
  password: string
}

// Initial state is derived from the staff prop during render (rule
// rerender-derived-state-no-effect): the parent mounts this component with a
// stable `key`, so switching between create/edit remounts and resets it
// without an effect.
function initialState(staff: Staff | null): FormState {
  if (!staff) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      addressId: '',
      storeId: '',
      username: '',
      password: '',
    }
  }

  return {
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email ?? '',
    addressId: String(staff.addressId),
    storeId: String(staff.storeId),
    username: staff.username,
    password: '',
  }
}

export function StaffForm({ staff, addresses, stores, saving, error, onSave, onCancel }: StaffFormProps) {
  const isEdit = staff !== null
  const [form, setForm] = useState<FormState>(() => initialState(staff))
  const [showPassword, setShowPassword] = useState(false)

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave({ ...form })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="staff-form-title">{isEdit ? `Edit staff #${staff.staffId}` : 'New staff member'}</h2>

        {error ? <p className="error-message">{error}</p> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              First name
              <input
                type="text"
                name="firstName"
                required
                maxLength={45}
                value={form.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                type="text"
                name="lastName"
                required
                maxLength={45}
                value={form.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Username
              <input
                type="text"
                name="username"
                required
                maxLength={16}
                autoComplete="username"
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                maxLength={50}
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Address
              <select
                name="addressId"
                required
                value={form.addressId}
                onChange={(event) => updateField('addressId', event.target.value)}
              >
                <option value="">Select an address…</option>
                {addresses.map((address) => (
                  <option key={address.addressId} value={address.addressId}>
                    {address.display}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Store
              <select
                name="storeId"
                required
                value={form.storeId}
                onChange={(event) => updateField('storeId', event.target.value)}
              >
                <option value="">Select a store…</option>
                {stores.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.display}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!isEdit ? (
            <>
              <label htmlFor="staff-password">Password</label>
              <div className="password-field">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
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
              <small className="muted">Stored hashed; it can never be read back.</small>
            </>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
