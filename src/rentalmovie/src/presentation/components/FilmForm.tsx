import { useState, type FormEvent } from 'react'
import type { FilmFormValues } from '../../application/dtos/filmDtos'
import { FILM_RATINGS, FILM_SPECIAL_FEATURES, type Film } from '../../domain/entities/film'
import type { LanguageOption } from '../../domain/entities/lookup'

interface FilmFormProps {
  // null means "create mode"; an existing film means "edit mode".
  film: Film | null
  languages: LanguageOption[]
  saving: boolean
  error: string | null
  // Raw values are forwarded as typed: normalization and validation belong to
  // the film service (application layer), not to the UI.
  onSave: (values: FilmFormValues) => void
  onCancel: () => void
}

interface FormState {
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

// Initial state is derived from the film prop during render (rule
// rerender-derived-state-no-effect): the parent mounts this component with a
// stable `key`, so switching between create/edit remounts and resets it
// without an effect.
function initialState(film: Film | null): FormState {
  if (!film) {
    // Defaults mirror the sakila column defaults (duration 3, rate 4.99, cost 19.99).
    return {
      title: '',
      description: '',
      releaseYear: '',
      languageId: '',
      originalLanguageId: '',
      rentalDurationDays: '3',
      rentalRate: '4.99',
      lengthMinutes: '',
      replacementCost: '19.99',
      rating: 'G',
      specialFeatures: [],
      copiesPerStore: '1',
    }
  }

  return {
    title: film.title,
    description: film.description ?? '',
    releaseYear: film.releaseYear === null ? '' : String(film.releaseYear),
    languageId: String(film.languageId),
    originalLanguageId: film.originalLanguageId === null ? '' : String(film.originalLanguageId),
    rentalDurationDays: String(film.rentalDurationDays),
    rentalRate: String(film.rentalRate),
    lengthMinutes: film.lengthMinutes === null ? '' : String(film.lengthMinutes),
    replacementCost: String(film.replacementCost),
    rating: film.rating,
    specialFeatures: [...film.specialFeatures],
    // Copies only apply when registering a new film.
    copiesPerStore: '1',
  }
}

export function FilmForm({ film, languages, saving, error, onSave, onCancel }: FilmFormProps) {
  const isEdit = film !== null
  const [form, setForm] = useState<FormState>(() => initialState(film))

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function toggleFeature(feature: string, checked: boolean) {
    setForm((previous) => ({
      ...previous,
      specialFeatures: checked
        ? [...previous.specialFeatures, feature]
        : previous.specialFeatures.filter((value) => value !== feature),
    }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave({ ...form })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="film-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="film-form-title">{isEdit ? `Edit film #${film.filmId}` : 'New film'}</h2>

        {error ? <p className="error-message">{error}</p> : null}

        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              type="text"
              name="title"
              required
              maxLength={128}
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </label>

          <div className="form-row">
            <label>
              Language
              <select
                name="languageId"
                required
                value={form.languageId}
                onChange={(event) => updateField('languageId', event.target.value)}
              >
                <option value="">Select a language…</option>
                {languages.map((language) => (
                  <option key={language.languageId} value={language.languageId}>
                    {language.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Original language
              <select
                name="originalLanguageId"
                value={form.originalLanguageId}
                onChange={(event) => updateField('originalLanguageId', event.target.value)}
              >
                <option value="">None</option>
                {languages.map((language) => (
                  <option key={language.languageId} value={language.languageId}>
                    {language.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Release year
              <input
                type="number"
                name="releaseYear"
                min={1901}
                max={new Date().getFullYear() + 1}
                step={1}
                placeholder="2006"
                value={form.releaseYear}
                onChange={(event) => updateField('releaseYear', event.target.value)}
              />
            </label>
            <label>
              Length (minutes)
              <input
                type="number"
                name="lengthMinutes"
                min={1}
                max={999}
                step={1}
                placeholder="86"
                value={form.lengthMinutes}
                onChange={(event) => updateField('lengthMinutes', event.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Rental duration (days)
              <input
                type="number"
                name="rentalDurationDays"
                required
                min={1}
                max={90}
                step={1}
                value={form.rentalDurationDays}
                onChange={(event) => updateField('rentalDurationDays', event.target.value)}
              />
            </label>
            <label>
              Rental rate
              <input
                type="number"
                name="rentalRate"
                required
                min={0}
                max={99.99}
                step={0.01}
                value={form.rentalRate}
                onChange={(event) => updateField('rentalRate', event.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Replacement cost
              <input
                type="number"
                name="replacementCost"
                required
                min={0}
                max={999.99}
                step={0.01}
                value={form.replacementCost}
                onChange={(event) => updateField('replacementCost', event.target.value)}
              />
            </label>
            <label>
              Rating
              <select
                name="rating"
                required
                value={form.rating}
                onChange={(event) => updateField('rating', event.target.value)}
              >
                {FILM_RATINGS.map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="feature-fieldset">
            <legend>Special features</legend>
            {FILM_SPECIAL_FEATURES.map((feature) => (
              <label key={feature} className="film-option">
                <input
                  type="checkbox"
                  name="specialFeatures"
                  value={feature}
                  checked={form.specialFeatures.includes(feature)}
                  onChange={(event) => toggleFeature(feature, event.target.checked)}
                />
                {feature}
              </label>
            ))}
          </fieldset>

          {isEdit ? null : (
            <label>
              Copies per store
              <input
                type="number"
                name="copiesPerStore"
                required
                min={1}
                max={100}
                step={1}
                value={form.copiesPerStore}
                onChange={(event) => updateField('copiesPerStore', event.target.value)}
              />
            </label>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
