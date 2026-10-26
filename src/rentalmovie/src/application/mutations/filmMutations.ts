import { useSWRConfig } from 'swr'
import type { Film } from '../../domain/entities/film'
import type { FilmFormValues } from '../dtos/filmDtos'
import { FILM_LIST_KEY_PREFIX } from '../queries/filmQueries'
import { LOOKUP_FILMS_KEY_PREFIX } from '../queries/lookupQueries'
import { RENTAL_LIST_KEY_PREFIX } from '../queries/rentalQueries'
import type { FilmService } from '../services/filmService'

/**
 * Mutation use cases for the film catalog page. Every write revalidates all
 * cached film lists, the rental-form film lookups (a new or edited film
 * changes the offered titles/rates/copies) and the rental lists (rows display
 * the film title), so the UI always shows server truth.
 */
export function useFilmMutations(service: FilmService) {
  // Scoped mutate (from useSWRConfig) respects the active cache provider, so
  // revalidation always targets the cache this tree is reading from.
  const { mutate } = useSWRConfig()

  function revalidateLists(): Promise<unknown> {
    return mutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith(FILM_LIST_KEY_PREFIX) ||
          key.startsWith(LOOKUP_FILMS_KEY_PREFIX) ||
          key.startsWith(RENTAL_LIST_KEY_PREFIX)),
    )
  }

  return {
    async create(values: FilmFormValues): Promise<Film> {
      const created = await service.create(values)
      await revalidateLists()
      return created
    },

    async update(filmId: number, values: FilmFormValues): Promise<Film> {
      const updated = await service.update(filmId, values)
      await revalidateLists()
      return updated
    },

    async setActive(film: Film): Promise<void> {
      // Logical leave / reactivation: toggle against the current state.
      await service.setActive(film.filmId, !film.active)
      await revalidateLists()
    },

    async delete(filmId: number): Promise<void> {
      await service.delete(filmId)
      await revalidateLists()
    },
  }
}
