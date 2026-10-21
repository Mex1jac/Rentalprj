import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Customer } from '../../domain/entities/customer'
import { CustomerForm } from '../../presentation/components/CustomerForm'

const addresses = [{ addressId: 3, display: '23 Workhaven Lane, Lethbridge' }]
const stores = [{ storeId: 1, display: 'Store 1 - 47 MySakila Drive' }]

const sampleCustomer: Customer = {
  customerId: 10,
  firstName: 'Mary',
  lastName: 'Smith',
  email: 'mary@example.com',
  addressId: 3,
  address: '23 Workhaven Lane, Lethbridge',
  storeId: 1,
  store: 'Store 1',
  active: true,
}

function renderForm(overrides: Partial<Parameters<typeof CustomerForm>[0]> = {}) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(
    <CustomerForm
      customer={null}
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

describe('CustomerForm (create mode)', () => {
  it('renders empty fields in a modal dialog', () => {
    renderForm()

    expect(screen.getByRole('dialog', { name: /new customer/i })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveValue('')
    expect(screen.getByLabelText('Last name')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })

  it('submits the raw values exactly as typed (normalization happens in the service)', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm()

    await user.type(screen.getByLabelText('First name'), '  Mary  ')
    await user.type(screen.getByLabelText('Last name'), ' Smith ')
    await user.type(screen.getByLabelText('Email'), ' mary@example.com ')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      firstName: '  Mary  ',
      lastName: ' Smith ',
      // type="email" is sanitized by the HTML spec itself (whitespace
      // stripped); every other field reaches the service untouched.
      email: 'mary@example.com',
      addressId: '3',
      storeId: '1',
    })
  })

  it('keeps an empty email as a raw string (the service converts it to null)', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm()

    await user.type(screen.getByLabelText('First name'), 'Mary')
    await user.type(screen.getByLabelText('Last name'), 'Smith')
    await user.selectOptions(screen.getByLabelText('Address'), '3')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSave.mock.calls[0][0].email).toBe('')
  })

  it('shows the server error when provided', () => {
    renderForm({ error: 'Customer with id 10 has 2 open rentals and cannot be deactivated.' })

    expect(
      screen.getByText('Customer with id 10 has 2 open rentals and cannot be deactivated.'),
    ).toBeInTheDocument()
  })
})

describe('CustomerForm (edit mode)', () => {
  it('prefills fields from the customer prop', () => {
    renderForm({ customer: sampleCustomer })

    expect(screen.getByRole('dialog', { name: /edit customer #10/i })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveValue('Mary')
    expect(screen.getByLabelText('Email')).toHaveValue('mary@example.com')
    expect(screen.getByLabelText('Address')).toHaveValue('3')
  })

  it('submits raw values on save changes', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm({ customer: sampleCustomer })

    await user.clear(screen.getByLabelText('First name'))
    await user.type(screen.getByLabelText('First name'), 'María')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const payload = onSave.mock.calls[0][0]
    expect(payload).toMatchObject({ firstName: 'María', lastName: 'Smith', addressId: '3' })
  })

  it('resets state when remounted with another customer (key-based reset)', () => {
    const { rerender } = render(
      <CustomerForm
        key="edit-10"
        customer={sampleCustomer}
        addresses={addresses}
        stores={stores}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    // New key: the form resets from the new prop without any effect.
    rerender(
      <CustomerForm
        key="edit-11"
        customer={{ ...sampleCustomer, customerId: 11, firstName: 'Ana' }}
        addresses={addresses}
        stores={stores}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('First name')).toHaveValue('Ana')
  })

  it('disables the submit button while saving', () => {
    renderForm({ customer: sampleCustomer, saving: true })

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })
})
