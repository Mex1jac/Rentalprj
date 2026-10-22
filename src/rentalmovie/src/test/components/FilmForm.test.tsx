import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Film } from '../../domain/entities/film'
import { FilmForm } from '../../presentation/components/FilmForm'

const languages = [
  { languageId: 1, name: 'English' },
  { languageId: 2, name: 'Italian' },
]

const sampleFilm: Film = {
  filmId: 1001,
  title: 'ACADEMY DINOSAUR',
  description: 'A Epic Drama.',
  releaseYear: 2006,
  languageId: 1,
  language: 'English',
  originalLanguageId: 2,
  originalLanguage: 'Italian',
  rentalDurationDays: 6,
  rentalRate: 0.99,
  lengthMinutes: 86,
  replacementCost: 20.99,
  rating: 'PG',
  specialFeatures: ['Trailers', 'Commentaries'],
  totalCopies: 4,
}

function renderForm(overrides: Partial<Parameters<typeof FilmForm>[0]> = {}) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(
    <FilmForm
      film={null}
      languages={languages}
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onSave, onCancel }
}

describe('FilmForm (create mode)', () => {
  it('renders the sakila defaults in a modal dialog', () => {
    renderForm()

    expect(screen.getByRole('dialog', { name: /new film/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('Rental duration (days)')).toHaveValue(3)
    expect(screen.getByLabelText('Rental rate')).toHaveValue(4.99)
    expect(screen.getByLabelText('Replacement cost')).toHaveValue(19.99)
    expect(screen.getByLabelText('Rating')).toHaveValue('G')
    expect(screen.getByLabelText('Copies per store')).toHaveValue(1)
  })

  it('submits the raw values exactly as typed (normalization happens in the service)', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm()

    await user.type(screen.getByLabelText('Title'), '  ACADEMY DINOSAUR ')
    await user.type(screen.getByLabelText('Description'), ' A Epic Drama ')
    await user.type(screen.getByLabelText('Release year'), '2006')
    await user.selectOptions(screen.getByLabelText('Language'), '1')
    await user.selectOptions(screen.getByLabelText('Original language'), '2')
    // Fields with sakila defaults are cleared before typing the new value.
    await user.clear(screen.getByLabelText('Rental duration (days)'))
    await user.type(screen.getByLabelText('Rental duration (days)'), '6')
    await user.clear(screen.getByLabelText('Rental rate'))
    await user.type(screen.getByLabelText('Rental rate'), '0.99')
    await user.type(screen.getByLabelText('Length (minutes)'), '86')
    await user.clear(screen.getByLabelText('Replacement cost'))
    await user.type(screen.getByLabelText('Replacement cost'), '20.99')
    await user.selectOptions(screen.getByLabelText('Rating'), 'PG')
    await user.click(screen.getByLabelText('Trailers'))
    await user.click(screen.getByLabelText('Commentaries'))
    await user.clear(screen.getByLabelText('Copies per store'))
    await user.type(screen.getByLabelText('Copies per store'), '2')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      title: '  ACADEMY DINOSAUR ',
      description: ' A Epic Drama ',
      releaseYear: '2006',
      languageId: '1',
      originalLanguageId: '2',
      rentalDurationDays: '6',
      rentalRate: '0.99',
      lengthMinutes: '86',
      replacementCost: '20.99',
      rating: 'PG',
      specialFeatures: ['Trailers', 'Commentaries'],
      copiesPerStore: '2',
    })
  })

  it('removes a special feature when its checkbox is unchecked again', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm()

    await user.type(screen.getByLabelText('Title'), 'X'.repeat(10))
    await user.selectOptions(screen.getByLabelText('Language'), '1')
    await user.click(screen.getByLabelText('Trailers'))
    await user.click(screen.getByLabelText('Trailers'))
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSave.mock.calls[0][0].specialFeatures).toEqual([])
  })

  it('shows the server error when provided', () => {
    renderForm({ error: 'Language with id 9 does not exist.' })

    expect(screen.getByText('Language with id 9 does not exist.')).toBeInTheDocument()
  })

  it('disables the submit button while saving', () => {
    renderForm({ saving: true })

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })
})

describe('FilmForm (edit mode)', () => {
  it('prefills every editable field from the film prop', () => {
    renderForm({ film: sampleFilm })

    expect(screen.getByRole('dialog', { name: /edit film #1001/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('ACADEMY DINOSAUR')
    expect(screen.getByLabelText('Description')).toHaveValue('A Epic Drama.')
    expect(screen.getByLabelText('Release year')).toHaveValue(2006)
    expect(screen.getByLabelText('Language')).toHaveValue('1')
    expect(screen.getByLabelText('Original language')).toHaveValue('2')
    expect(screen.getByLabelText('Rental duration (days)')).toHaveValue(6)
    expect(screen.getByLabelText('Rental rate')).toHaveValue(0.99)
    expect(screen.getByLabelText('Length (minutes)')).toHaveValue(86)
    expect(screen.getByLabelText('Replacement cost')).toHaveValue(20.99)
    expect(screen.getByLabelText('Rating')).toHaveValue('PG')
    expect(screen.getByLabelText('Trailers')).toBeChecked()
    expect(screen.getByLabelText('Commentaries')).toBeChecked()
  })

  it('hides the copies field (copies only apply when registering)', () => {
    renderForm({ film: sampleFilm })

    expect(screen.queryByLabelText('Copies per store')).not.toBeInTheDocument()
  })

  it('submits raw values on save changes', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm({ film: sampleFilm })

    await user.clear(screen.getByLabelText('Rental rate'))
    await user.type(screen.getByLabelText('Rental rate'), '5.99')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: 'ACADEMY DINOSAUR',
      rentalRate: '5.99',
      rating: 'PG',
      specialFeatures: ['Trailers', 'Commentaries'],
    })
  })

  it('resets state when remounted with another film (key-based reset)', () => {
    const { rerender } = render(
      <FilmForm
        key="edit-1001"
        film={sampleFilm}
        languages={languages}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    // New key: the form resets from the new prop without any effect.
    rerender(
      <FilmForm
        key="edit-1002"
        film={{ ...sampleFilm, filmId: 1002, title: 'ACE GOLDFINGER' }}
        languages={languages}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Title')).toHaveValue('ACE GOLDFINGER')
  })
})
