// Film in the club's catalog (mirrors Domain/Entities/Film.cs).

export interface Film {
  filmId: number
  title: string
  description: string | null
  releaseYear: number | null
  languageId: number
  language: string
  originalLanguageId: number | null
  originalLanguage: string | null
  rentalDurationDays: number
  rentalRate: number
  lengthMinutes: number | null
  replacementCost: number
  rating: string
  specialFeatures: string[]
  totalCopies: number
  /** False once the film has been logically deactivated (backlog #8). */
  active: boolean
}

/** Every editable film field (no ids or derived values). */
export interface FilmData {
  title: string
  description: string | null
  releaseYear: number | null
  languageId: number
  originalLanguageId: number | null
  rentalDurationDays: number
  rentalRate: number
  lengthMinutes: number | null
  replacementCost: number
  rating: string
  specialFeatures: string[]
}

/** Film data plus the copies to stock per store on day one (create only). */
export interface FilmCreateData extends FilmData {
  copiesPerStore: number
}

/** sakila film.rating enum values (mirrors FilmService.AllowedRatings). */
export const FILM_RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17'] as const

/** sakila film.special_features SET values (mirrors FilmService.AllowedSpecialFeatures). */
export const FILM_SPECIAL_FEATURES = [
  'Trailers',
  'Commentaries',
  'Deleted Scenes',
  'Behind the Scenes',
] as const

/** Server-side status filter for the film list (mirrors FilmListStatus.cs). */
export type FilmStatusFilter = 'all' | 'active' | 'inactive'
