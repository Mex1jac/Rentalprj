import { ValidationError } from '../../domain/errors/domainErrors'
import {
  FILM_RATINGS,
  FILM_SPECIAL_FEATURES,
  type Film,
  type FilmCreateData,
  type FilmData,
} from '../../domain/entities/film'
import type { FilmRepository } from '../../domain/ports/filmRepository'
import type { FilmFormValues } from '../dtos/filmDtos'

// Business rules mirrored from Application/Services/FilmService.cs so invalid
// input fails fast with exactly the wording the API would return.
export const MAX_TITLE_LENGTH = 128
export const MAX_DESCRIPTION_LENGTH = 2000
export const MIN_RELEASE_YEAR = 1901
export const MIN_RENTAL_DURATION_DAYS = 1
export const MAX_RENTAL_DURATION_DAYS = 90
export const MIN_RENTAL_RATE = 0
export const MAX_RENTAL_RATE = 99.99
export const MIN_LENGTH_MINUTES = 1
export const MAX_LENGTH_MINUTES = 999
export const MIN_REPLACEMENT_COST = 0
export const MAX_REPLACEMENT_COST = 999.99
export const MIN_COPIES_PER_STORE = 1
export const MAX_COPIES_PER_STORE = 100

/** Maximum accepted release year (a one-year horizon for pre-releases). */
export function maxReleaseYear(): number {
  return new Date().getFullYear() + 1
}

/** True when the monetary value has at most 2 decimals. */
function hasAtMostTwoDecimals(value: number): boolean {
  return Math.round(value * 100) / 100 === value
}

export function normalizeFilmForm(values: FilmFormValues): FilmData {
  const title = values.title.trim()
  const description = values.description.trim()
  const releaseYear = values.releaseYear.trim() === '' ? null : Number(values.releaseYear)
  const languageId = Number(values.languageId)
  const originalLanguageId =
    values.originalLanguageId.trim() === '' ? null : Number(values.originalLanguageId)
  const rentalDurationDays = Number(values.rentalDurationDays)
  const rentalRate = Number(values.rentalRate)
  const lengthMinutes = values.lengthMinutes.trim() === '' ? null : Number(values.lengthMinutes)
  const replacementCost = Number(values.replacementCost)
  const rating = values.rating.trim() === '' ? 'G' : values.rating.trim()
  const specialFeatures = values.specialFeatures
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0)

  if (title === '' || title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(
      `Title is required and cannot exceed ${MAX_TITLE_LENGTH} characters.`,
    )
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`)
  }
  if (releaseYear !== null && (releaseYear < MIN_RELEASE_YEAR || releaseYear > maxReleaseYear())) {
    throw new ValidationError(`Release year must be between ${MIN_RELEASE_YEAR} and ${maxReleaseYear()}.`)
  }
  if (!Number.isInteger(languageId) || languageId <= 0) {
    throw new ValidationError('A language must be selected.')
  }
  if (originalLanguageId !== null && (!Number.isInteger(originalLanguageId) || originalLanguageId <= 0)) {
    throw new ValidationError('An original language must be selected.')
  }
  if (
    !Number.isInteger(rentalDurationDays) ||
    rentalDurationDays < MIN_RENTAL_DURATION_DAYS ||
    rentalDurationDays > MAX_RENTAL_DURATION_DAYS
  ) {
    throw new ValidationError(
      `Rental duration must be between ${MIN_RENTAL_DURATION_DAYS} and ${MAX_RENTAL_DURATION_DAYS} days.`,
    )
  }
  if (!(rentalRate >= MIN_RENTAL_RATE && rentalRate <= MAX_RENTAL_RATE)) {
    throw new ValidationError('Rental rate must be between 0.00 and 99.99.')
  }
  if (!hasAtMostTwoDecimals(rentalRate)) {
    throw new ValidationError('Rental rate must have at most 2 decimals.')
  }
  if (
    lengthMinutes !== null &&
    (!Number.isInteger(lengthMinutes) || lengthMinutes < MIN_LENGTH_MINUTES || lengthMinutes > MAX_LENGTH_MINUTES)
  ) {
    throw new ValidationError(`Length must be between ${MIN_LENGTH_MINUTES} and ${MAX_LENGTH_MINUTES} minutes.`)
  }
  if (!(replacementCost >= MIN_REPLACEMENT_COST && replacementCost <= MAX_REPLACEMENT_COST)) {
    throw new ValidationError('Replacement cost must be between 0.00 and 999.99.')
  }
  if (!hasAtMostTwoDecimals(replacementCost)) {
    throw new ValidationError('Replacement cost must have at most 2 decimals.')
  }
  if (!(FILM_RATINGS as readonly string[]).includes(rating)) {
    throw new ValidationError(`Rating must be one of: ${FILM_RATINGS.join(', ')}.`)
  }
  for (const feature of specialFeatures) {
    if (!(FILM_SPECIAL_FEATURES as readonly string[]).includes(feature)) {
      throw new ValidationError(`Special feature '${feature}' is not allowed.`)
    }
  }

  return {
    title,
    description: description === '' ? null : description,
    releaseYear,
    languageId,
    originalLanguageId,
    rentalDurationDays,
    rentalRate,
    lengthMinutes,
    replacementCost,
    rating,
    specialFeatures,
  }
}

/** Create payload: every editable field plus the copies per store on day one. */
export function normalizeFilmCreateForm(values: FilmFormValues): FilmCreateData {
  const data = normalizeFilmForm(values)
  const copiesPerStore = Number(values.copiesPerStore)

  if (
    !Number.isInteger(copiesPerStore) ||
    copiesPerStore < MIN_COPIES_PER_STORE ||
    copiesPerStore > MAX_COPIES_PER_STORE
  ) {
    throw new ValidationError(
      `Copies per store must be between ${MIN_COPIES_PER_STORE} and ${MAX_COPIES_PER_STORE}.`,
    )
  }

  return { ...data, copiesPerStore }
}

/** Use cases for the film catalog page (mirrors FilmService.cs). */
export interface FilmService {
  create(values: FilmFormValues): Promise<Film>

  update(filmId: number, values: FilmFormValues): Promise<Film>

  /** Logical leave / reactivation (backlog #8): flips the film's active flag. */
  setActive(filmId: number, active: boolean): Promise<void>

  delete(filmId: number): Promise<void>
}

/**
 * Service factory over the persistence port: the application layer depends
 * only on the domain contract, the concrete adapter is injected at the
 * composition root (presentation/App.tsx).
 */
export function createFilmService(repository: FilmRepository): FilmService {
  return {
    // async methods: validation failures always surface as rejected promises,
    // never as synchronous throws, so callers can uniformly `await` them.
    async create(values) {
      return repository.create(normalizeFilmCreateForm(values))
    },

    async update(filmId, values) {
      return repository.update(filmId, normalizeFilmForm(values))
    },

    async setActive(filmId, active) {
      return repository.setActive(filmId, active)
    },

    async delete(filmId) {
      return repository.delete(filmId)
    },
  }
}
