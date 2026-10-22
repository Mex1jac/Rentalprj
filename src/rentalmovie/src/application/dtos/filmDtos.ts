// Application DTOs for the film catalog page.

/**
 * Raw values collected by the film form: every field is a string exactly as
 * typed by the operator (special features are the checked SET values).
 * Normalization and validation live in the film service (application layer),
 * never in the UI.
 */
export interface FilmFormValues {
  title: string
  description: string
  releaseYear: string
  languageId: string
  originalLanguageId: string
  rentalDurationDays: string
  rentalRate: string
  lengthMinutes: string
  replacementCost: string
  rating: string
  specialFeatures: string[]
  copiesPerStore: string
}
