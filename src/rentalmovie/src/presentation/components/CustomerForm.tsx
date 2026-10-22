import { useState, type FormEvent } from 'react'
import type { CustomerFormValues } from '../../application/dtos/customerDtos'
import type { AddressOption, StoreOption } from '../../domain/entities/lookup'
import type { Customer } from '../../domain/entities/customer'

interface CustomerFormProps {
  // null means "create mode"; an existing customer means "edit mode".
  customer: Customer | null
  addresses: AddressOption[]
  stores: StoreOption[]
  saving: boolean
  error: string | null
  // Raw values are forwarded as typed: normalization and validation belong to
  // the customer service (application layer), not to the UI.
  onSave: (values: CustomerFormValues) => void
  onCancel: () => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  addressId: string
  storeId: string
}

// Initial state is derived from the customer prop during render (rule
// rerender-derived-state-no-effect): the parent mounts this component with a
// stable `key`, so switching between create/edit remounts and resets it
// without an effect.
function initialState(customer: Customer | null): FormState {
  if (!customer) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      addressId: '',
      storeId: '',
    }
  }

  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email ?? '',
    addressId: String(customer.addressId),
    storeId: String(customer.storeId),
  }
}

export function CustomerForm({ customer, addresses, stores, saving, error, onSave, onCancel }: CustomerFormProps) {
  const isEdit = customer !== null
  const [form, setForm] = useState<FormState>(() => initialState(customer))

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
        aria-labelledby="customer-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="customer-form-title">{isEdit ? `Edit customer #${customer.customerId}` : 'New customer'}</h2>

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
