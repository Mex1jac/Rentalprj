import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Customer } from '../../domain/entities/customer'
import type { FilmOption, StoreOption } from '../../domain/entities/lookup'
import type { Staff } from '../../domain/entities/staff'
import { RentalCreateForm } from '../../presentation/components/RentalCreateForm'

const customers: Customer[] = [
  {
    customerId: 10,
    firstName: 'Mary',
    lastName: 'Smith',
    email: null,
    addressId: 1,
    address: '23 Workhaven Lane',
    storeId: 1,
    store: 'Store 1',
    active: true,
  },
]

const staff: Staff[] = [
  {
    staffId: 1,
    firstName: 'Mike',
    lastName: 'Hillyer',
    email: null,
    addressId: 1,
    address: '23 Workhaven Lane',
    storeId: 1,
    store: 'Store 1',
    active: true,
    username: 'Mike',
  },
]

const stores: StoreOption[] = [{ storeId: 1, display: 'Store 1 - 47 MySakila Drive' }]

const films: FilmOption[] = [
  { filmId: 1, title: 'ACADEMY DINOSAUR', rentalDurationDays: 3, rentalRate: 4.99, availableCopies: 2 },
  // No copies currently on rental: hidden from the picker.
  { filmId: 2, title: 'ACE GOLDFINGER', rentalDurationDays: 6, rentalRate: 2.99, availableCopies: 0 },
  { filmId: 3, title: 'ADAPTATION HOLES', rentalDurationDays: 6, rentalRate: 2.99, availableCopies: 5 },
]

function renderForm(overrides: Partial<Parameters<typeof RentalCreateForm>[0]> = {}) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  const onStoreChange = vi.fn()
  render(
    <RentalCreateForm
      customers={customers}
      staff={staff}
      stores={stores}
      films={[]}
      filmsLoading={false}
      storeId=""
      onStoreChange={onStoreChange}
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onSave, onCancel, onStoreChange }
}

describe('RentalCreateForm', () => {
  it('renders the modal and asks for a store before listing films', () => {
    renderForm()

    expect(screen.getByRole('dialog', { name: /new rental/i })).toBeInTheDocument()
    expect(screen.getByText('Select a store to list its available films.')).toBeInTheDocument()
    expect(screen.getByLabelText('Rental days')).toHaveValue(6)
  })

  it('forwards the store selection so the parent fetches its films', async () => {
    const user = userEvent.setup()
    const { onStoreChange } = renderForm()

    await user.selectOptions(screen.getByLabelText('Store'), '1')

    expect(onStoreChange).toHaveBeenCalledWith('1')
  })

  it('shows the loading state while the films of the store are loading', () => {
    renderForm({ storeId: '1', filmsLoading: true })

    expect(screen.getByText('Loading films…')).toBeInTheDocument()
  })

  it('lists only films with available copies and filters by title', async () => {
    const user = userEvent.setup()
    renderForm({ storeId: '1', films })

    // ACE GOLDFINGER has zero available copies: it never shows.
    expect(screen.getByRole('checkbox', { name: /ACADEMY DINOSAUR/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /ADAPTATION HOLES/ })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /ACE GOLDFINGER/ })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Films'), 'adapt')

    expect(screen.getByRole('checkbox', { name: /ADAPTATION HOLES/ })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /ACADEMY DINOSAUR/ })).not.toBeInTheDocument()
  })

  it('suggests the film default days while the operator has not typed', async () => {
    const user = userEvent.setup()
    renderForm({ storeId: '1', films })

    expect(screen.getByRole('spinbutton', { name: /Rental days/ })).toHaveValue(6)

    await user.click(screen.getByRole('checkbox', { name: /ACADEMY DINOSAUR/ }))

    // ACADEMY DINOSAUR declares 3 rental days; the suggestion follows.
    expect(screen.getByRole('spinbutton', { name: /Rental days/ })).toHaveValue(3)
    expect(screen.getByText('1 film(s) selected · 3 day(s)')).toBeInTheDocument()
  })

  it('keeps the operator-typed days even when the selection changes', async () => {
    const user = userEvent.setup()
    renderForm({ storeId: '1', films })

    await user.clear(screen.getByLabelText('Rental days'))
    await user.type(screen.getByLabelText('Rental days'), '9')
    await user.click(screen.getByRole('checkbox', { name: /ACADEMY DINOSAUR/ }))

    expect(screen.getByLabelText('Rental days')).toHaveValue(9)
  })

  it('submits the raw values exactly as displayed (service normalizes them)', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm({ storeId: '1', films })

    await user.selectOptions(screen.getByLabelText('Customer'), '10')
    await user.selectOptions(screen.getByLabelText('Staff member'), '1')
    await user.selectOptions(screen.getByLabelText('Store'), '1')
    await user.click(screen.getByRole('checkbox', { name: /ACADEMY DINOSAUR/ }))
    await user.click(screen.getByRole('checkbox', { name: /ADAPTATION HOLES/ }))
    await user.click(screen.getByRole('button', { name: /rent 2 film/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      customerId: '10',
      staffId: '1',
      storeId: '1',
      rentalDays: '3',
      filmIds: ['1', '3'],
    })
  })

  it('shows the server error when provided', () => {
    renderForm({ error: "Film 'ACADEMY DINOSAUR' does not have enough available copies." })

    expect(
      screen.getByText("Film 'ACADEMY DINOSAUR' does not have enough available copies."),
    ).toBeInTheDocument()
  })

  it('disables the submit button while saving', () => {
    renderForm({ saving: true })

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })
})
