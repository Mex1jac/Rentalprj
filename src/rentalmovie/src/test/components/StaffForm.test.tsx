import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Staff } from '../../domain/entities/staff'
import { StaffForm } from '../../presentation/components/StaffForm'

const addresses = [{ addressId: 3, display: '23 Workhaven Lane, Lethbridge' }]
const stores = [{ storeId: 1, display: 'Store 1 - 47 MySakila Drive' }]

const sampleStaff: Staff = {
  staffId: 7,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  addressId: 3,
  address: '23 Workhaven Lane, Lethbridge',
  storeId: 1,
  store: 'Store 1',
  active: true,
  username: 'jdoe',
}

function renderForm(overrides: Partial<Parameters<typeof StaffForm>[0]> = {}) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(
    <StaffForm
      staff={null}
      addresses={addresses}
      stores={stores}
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onSave, onCancel }
}

describe('StaffForm (create mode)', () => {
  it('renders empty fields and the password input', () => {
    renderForm()

    expect(screen.getByRole('dialog', { name: /new staff member/i })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('masks the password by default and toggles visibility', async () => {
    const user = userEvent.setup()
    renderForm()

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('submits the raw values exactly as typed (normalization happens in the service)', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm()

    await user.type(screen.getByLabelText('First name'), '  Jane  ')
    await user.type(screen.getByLabelText('Last name'), ' Smith ')
    await user.type(screen.getByLabelText('Username'), ' jsmith ')
    await user.type(screen.getByLabelText('Email'), ' jane@example.com ')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      firstName: '  Jane  ',
      lastName: ' Smith ',
      // type="email" is sanitized by the HTML spec itself (whitespace
      // stripped); every other field reaches the service untouched.
      email: 'jane@example.com',
      addressId: '3',
      storeId: '1',
      username: ' jsmith ',
      password: 'secret123',
    })
  })

  it('keeps an empty email as a raw string (the service converts it to null)', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm()

    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.type(screen.getByLabelText('Last name'), 'Smith')
    await user.type(screen.getByLabelText('Username'), 'jsmith')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSave.mock.calls[0][0].email).toBe('')
  })

  it('shows the server error when provided', () => {
    renderForm({ error: 'Username already in use.' })

    expect(screen.getByText('Username already in use.')).toBeInTheDocument()
  })
})

describe('StaffForm (edit mode)', () => {
  it('prefills fields from the staff prop and hides the password input', () => {
    renderForm({ staff: sampleStaff })

    expect(screen.getByRole('dialog', { name: /edit staff #7/i })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveValue('John')
    expect(screen.getByLabelText('Username')).toHaveValue('jdoe')
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('submits raw values with an empty password (the service ignores it)', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm({ staff: sampleStaff })

    await user.clear(screen.getByLabelText('First name'))
    await user.type(screen.getByLabelText('First name'), 'Jon')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const payload = onSave.mock.calls[0][0]
    expect(payload).toMatchObject({ firstName: 'Jon', username: 'jdoe', addressId: '3' })
    expect(payload.password).toBe('')
  })

  it('resets state when remounted with another staff (key-based reset)', () => {
    const { rerender } = render(
      <StaffForm
        key="edit-7"
        staff={sampleStaff}
        addresses={addresses}
        stores={stores}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    // Same key: state is preserved (user edit in progress).
    rerender(
      <StaffForm
        key="edit-7"
        staff={{ ...sampleStaff, firstName: 'John' }}
        addresses={addresses}
        stores={stores}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('First name')).toHaveValue('John')

    // New key: the form resets from the new prop without any effect.
    rerender(
      <StaffForm
        key="edit-8"
        staff={{ ...sampleStaff, staffId: 8, firstName: 'Ana', username: 'asmith' }}
        addresses={addresses}
        stores={stores}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('First name')).toHaveValue('Ana')
    expect(screen.getByLabelText('Username')).toHaveValue('asmith')
  })

  it('disables the submit button while saving', () => {
    renderForm({ staff: sampleStaff, saving: true })

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })
})
