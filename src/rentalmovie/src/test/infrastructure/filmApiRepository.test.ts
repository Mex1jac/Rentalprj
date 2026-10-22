import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Film } from '../../domain/entities/film'
import { ConflictError, NotFoundError } from '../../domain/errors/domainErrors'
import { filmApiRepository } from '../../infrastructure/persistence/filmApiRepository'

const filmRow: Film = {
  filmId: 1001,
  title: 'ACADEMY DINOSAUR',
  description: 'A Epic Drama.',
  releaseYear: 2006,
  languageId: 1,
  language: 'English',
  originalLanguageId: null,
  originalLanguage: null,
  rentalDurationDays: 6,
  rentalRate: 0.99,
  lengthMinutes: 86,
  replacementCost: 20.99,
  rating: 'PG',
  specialFeatures: ['Trailers', 'Commentaries'],
  totalCopies: 4,
}

/** Transport seam: the repository is tested against a stubbed fetch. */
function stubFetch(payload: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('filmApiRepository', () => {
  it('list with no filters requests /api/films (full list)', async () => {
    const fetchMock = stubFetch({ items: [], page: 1, pageSize: 0, total: 0, totalPages: 1 })

    await filmApiRepository.list({})

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5174/api/films', expect.anything())
  })

  it('list encodes the search and pagination params', async () => {
    const fetchMock = stubFetch({ items: [], page: 2, pageSize: 25, total: 0, totalPages: 1 })

    const result = await filmApiRepository.list({ search: 'dino', page: 2, pageSize: 25 })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5174/api/films?search=dino&page=2&pageSize=25',
      expect.anything(),
    )
    expect(result).toEqual({ items: [], page: 2, pageSize: 25, total: 0, totalPages: 1 })
  })

  it('list keeps the full-list contract when pagination is omitted', async () => {
    const fetchMock = stubFetch({ items: [], page: 1, pageSize: 0, total: 0, totalPages: 1 })

    await filmApiRepository.list({ search: 'dino' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5174/api/films?search=dino',
      expect.anything(),
    )
  })

  it('create posts the normalized data exactly once', async () => {
    const fetchMock = stubFetch(filmRow, 201)

    await filmApiRepository.create({
      title: 'ACADEMY DINOSAUR',
      description: 'A Epic Drama.',
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

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/films')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      title: 'ACADEMY DINOSAUR',
      description: 'A Epic Drama.',
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

  it('update uses the film-specific URL', async () => {
    const fetchMock = stubFetch(filmRow)

    await filmApiRepository.update(1001, {
      title: 'ACADEMY DINOSAUR',
      description: null,
      releaseYear: null,
      languageId: 1,
      originalLanguageId: null,
      rentalDurationDays: 3,
      rentalRate: 4.99,
      lengthMinutes: null,
      replacementCost: 19.99,
      rating: 'G',
      specialFeatures: [],
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/films/1001')
    expect(init.method).toBe('PUT')
  })

  it('delete issues a DELETE against the film URL (204 body is ignored)', async () => {
    const fetchMock = stubFetch(undefined, 204)

    await filmApiRepository.delete(1001)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:5174/api/films/1001')
    expect(init.method).toBe('DELETE')
  })

  it('translates a 404 update into a domain NotFoundError', async () => {
    stubFetch({ error: 'Film with id 1001 was not found.' }, 404)

    const error = await filmApiRepository
      .update(1001, {
        title: 'ACADEMY DINOSAUR',
        description: null,
        releaseYear: null,
        languageId: 1,
        originalLanguageId: null,
        rentalDurationDays: 3,
        rentalRate: 4.99,
        lengthMinutes: null,
        replacementCost: 19.99,
        rating: 'G',
        specialFeatures: [],
      })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(NotFoundError)
    expect((error as NotFoundError).message).toBe('Film with id 1001 was not found.')
  })

  it('translates a 409 delete conflict into a domain ConflictError', async () => {
    stubFetch(
      { error: 'Film with id 1001 has 4 copies in inventory and cannot be deleted.' },
      409,
    )

    const error = await filmApiRepository.delete(1001).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).message).toBe(
      'Film with id 1001 has 4 copies in inventory and cannot be deleted.',
    )
  })
})
