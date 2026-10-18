import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Staff } from '../../domain/entities/staff'
import { PasswordForm } from '../../presentation/components/PasswordForm'

const staff: Staff = {
  staffId: 7,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  addressId: 3,
  address: '23 Workhaven Lane',
  storeId: 1,
  store: 'Store 1',
  active: true,
  username: 'jdoe',
}

function renderPasswordForm(overrides: Partial<Parameters<typeof PasswordForm>[0]> = {}) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(
    <PasswordForm
      staff={staff}
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onSave, onCancel }
}

describe('PasswordForm', () => {
  it('never exposes the current password, only a masked indicator', () => {
    renderPasswordForm()

    expect(screen.getByText('••••••••')).toBeInTheDocument()
    // No input carries a value from the server: both start empty.
    const inputs = screen.getAllByDisplayValue('')
    expect(inputs).toHaveLength(2)
  })

  it('rejects a confirmation that does not match', async () => {
    const user = userEvent.setup()
    const { onSave } = renderPasswordForm()

    await user.type(screen.getByLabelText('New password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm new password'), 'different1')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('submits the new password when both fields match', async () => {
    const user = userEvent.setup()
    const { onSave } = renderPasswordForm()

    await user.type(screen.getByLabelText('New password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm new password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(onSave).toHaveBeenCalledWith('secret123')
  })

  it('masks the new password by default and toggles visibility', async () => {
    const user = userEvent.setup()
    renderPasswordForm()

    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'text')
  })

  it('shows the server error when provided', () => {
    renderPasswordForm({ error: 'Staff with id 7 was not found.' })

    expect(screen.getByText('Staff with id 7 was not found.')).toBeInTheDocument()
  })
})
