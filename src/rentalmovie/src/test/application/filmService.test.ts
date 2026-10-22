import { describe, expect, it, vi } from 'vitest'
import type { FilmFormValues } from '../../application/dtos/filmDtos'
import { createFilmService, normalizeFilmCreateForm, normalizeFilmForm } from '../../application/services/filmService'
import type { Film } from '../../domain/entities/film'
import { emptyPage } from '../../domain/entities/pagedResult'
import { ValidationError } from '../../domain/errors/domainErrors'
import type { FilmListQuery } from '../../domain/ports/filmRepository'

const validValues: FilmFormValues = {
  title: '  ACADEMY DINOSAUR ',
  description: '  A Epic Drama of a Feminist. ',
  releaseYear: ' 2006 ',
  languageId: '1',
  originalLanguageId: '',
  rentalDurationDays: '6',
  rentalRate: ' 0.99 ',
  lengthMinutes: ' 86 ',
  replacementCost: '20.99',
  rating: 'PG',
  specialFeatures: ['Trailers', 'Commentaries'],
  copiesPerStore: '2',
}

function makeRepository() {
  return {
    list: vi.fn(async (_query: FilmListQuery) => emptyPage<Film>(1, 25)),
    create: vi.fn(async (_data: unknown) => ({}) as Film),
    update: vi.fn(async (_filmId: number, _data: unknown) => ({}) as Film),
    delete: vi.fn(async (_filmId: number) => undefined),
  }
}

describe('normalizeFilmForm', () => {
  it('trims text fields and converts numeric strings to numbers', () => {
    const data = normalizeFilmForm(validValues)

    expect(data).toEqual({
      title: 'ACADEMY DINOSAUR',
      description: 'A Epic Drama of a Feminist.',
      releaseYear: 2006,
      languageId: 1,
      originalLanguageId: null,
      rentalDurationDays: 6,
      rentalRate: 0.99,
      lengthMinutes: 86,
      replacementCost: 20.99,
      rating: 'PG',
      specialFeatures: ['Trailers', 'Commentaries'],
    })
  })

  it('normalizes empty description, release year, length and original language to null', () => {
    const data = normalizeFilmForm({
      ...validValues,
      description: '   ',
      releaseYear: '',
      lengthMinutes: '',
      originalLanguageId: '   ',
    })

    expect(data.description).toBeNull()
    expect(data.releaseYear).toBeNull()
    expect(data.lengthMinutes).toBeNull()
    expect(data.originalLanguageId).toBeNull()
  })

  it('defaults a blank rating to G (sakila column default)', () => {
    expect(normalizeFilmForm({ ...validValues, rating: '  ' }).rating).toBe('G')
  })

  it('rejects an empty title with the backend wording', () => {
    expect(() => normalizeFilmForm({ ...validValues, title: '   ' })).toThrowError(
      'Title is required and cannot exceed 128 characters.',
    )
  })

  it('rejects a title longer than 128 characters', () => {
    expect(() => normalizeFilmForm({ ...validValues, title: 'a'.repeat(129) })).toThrowError(
      'Title is required and cannot exceed 128 characters.',
    )
  })

  it('rejects a description longer than 2000 characters', () => {
    expect(() => normalizeFilmForm({ ...validValues, description: 'a'.repeat(2001) })).toThrowError(
      'Description cannot exceed 2000 characters.',
    )
  })

  it('rejects a release year outside 1901..next year', () => {
    const nextYear = new Date().getFullYear() + 1
    expect(() => normalizeFilmForm({ ...validValues, releaseYear: '1900' })).toThrowError(
      `Release year must be between 1901 and ${nextYear}.`,
    )
    expect(() => normalizeFilmForm({ ...validValues, releaseYear: '3000' })).toThrowError(
      `Release year must be between 1901 and ${nextYear}.`,
    )
  })

  it('rejects a missing language selection', () => {
    expect(() => normalizeFilmForm({ ...validValues, languageId: '' })).toThrowError(
      'A language must be selected.',
    )
  })

  it('rejects a rental duration outside 1..90 days', () => {
    expect(() => normalizeFilmForm({ ...validValues, rentalDurationDays: '0' })).toThrowError(
      'Rental duration must be between 1 and 90 days.',
    )
    expect(() => normalizeFilmForm({ ...validValues, rentalDurationDays: '91' })).toThrowError(
      'Rental duration must be between 1 and 90 days.',
    )
  })

  it('rejects a rental rate outside 0.00..99.99', () => {
    expect(() => normalizeFilmForm({ ...validValues, rentalRate: '-0.01' })).toThrowError(
      'Rental rate must be between 0.00 and 99.99.',
    )
    expect(() => normalizeFilmForm({ ...validValues, rentalRate: '100.00' })).toThrowError(
      'Rental rate must be between 0.00 and 99.99.',
    )
  })

  it('rejects a rental rate with more than 2 decimals', () => {
    expect(() => normalizeFilmForm({ ...validValues, rentalRate: '4.999' })).toThrowError(
      'Rental rate must have at most 2 decimals.',
    )
  })

  it('rejects a length outside 1..999 minutes', () => {
    expect(() => normalizeFilmForm({ ...validValues, lengthMinutes: '0' })).toThrowError(
      'Length must be between 1 and 999 minutes.',
    )
    expect(() => normalizeFilmForm({ ...validValues, lengthMinutes: '1000' })).toThrowError(
      'Length must be between 1 and 999 minutes.',
    )
  })

  it('rejects a replacement cost outside 0.00..999.99', () => {
    expect(() => normalizeFilmForm({ ...validValues, replacementCost: '1000.00' })).toThrowError(
      'Replacement cost must be between 0.00 and 999.99.',
    )
  })

  it('rejects a replacement cost with more than 2 decimals', () => {
    expect(() => normalizeFilmForm({ ...validValues, replacementCost: '19.999' })).toThrowError(
      'Replacement cost must have at most 2 decimals.',
    )
  })

  it('rejects a rating outside the sakila enum', () => {
    expect(() => normalizeFilmForm({ ...validValues, rating: 'R-18' })).toThrowError(
      'Rating must be one of: G, PG, PG-13, R, NC-17.',
    )
  })

  it('rejects a special feature outside the sakila SET', () => {
    expect(() =>
      normalizeFilmForm({ ...validValues, specialFeatures: ['Trailers', 'Bloopers'] }),
    ).toThrowError("Special feature 'Bloopers' is not allowed.")
  })
})

describe('normalizeFilmCreateForm', () => {
  it('adds the copies per store to the normalized data', () => {
    const data = normalizeFilmCreateForm(validValues)
    expect(data.copiesPerStore).toBe(2)
  })

  it('rejects copies per store outside 1..100', () => {
    expect(() => normalizeFilmCreateForm({ ...validValues, copiesPerStore: '0' })).toThrowError(
      'Copies per store must be between 1 and 100.',
    )
    expect(() => normalizeFilmCreateForm({ ...validValues, copiesPerStore: '101' })).toThrowError(
      'Copies per store must be between 1 and 100.',
    )
  })
})

describe('createFilmService', () => {
  it('create sends the normalized data plus copies per store', async () => {
    const repository = makeRepository()
    const service = createFilmService(repository)

    await service.create(validValues)

    expect(repository.create).toHaveBeenCalledWith({
      title: 'ACADEMY DINOSAUR',
      description: 'A Epic Drama of a Feminist.',
      releaseYear: 2006,
      languageId: 1,
      originalLanguageId: null,
      rentalDurationDays: 6,
      rentalRate: 0.99,
      lengthMinutes: 86,
      replacementCost: 20.99,
      rating: 'PG',
      specialFeatures: ['Trailers', 'Commentaries'],
      copiesPerStore: 2,
    })
  })

  it('create rejects invalid input before touching the repository', async () => {
    const repository = makeRepository()
    const service = createFilmService(repository)

    await expect(service.create({ ...validValues, title: '' })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('update normalizes and passes the film id', async () => {
    const repository = makeRepository()
    const service = createFilmService(repository)

    await service.update(1001, validValues)

    expect(repository.update).toHaveBeenCalledWith(
      1001,
      expect.objectContaining({ title: 'ACADEMY DINOSAUR', rentalRate: 0.99 }),
    )
  })

  it('delete passes the film id through untouched', async () => {
    const repository = makeRepository()
    const service = createFilmService(repository)

    await service.delete(1001)

    expect(repository.delete).toHaveBeenCalledWith(1001)
  })
})
