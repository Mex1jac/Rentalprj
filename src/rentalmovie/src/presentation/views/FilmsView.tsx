import { useDeferredValue, useMemo, useState } from 'react'
import type { FilmFormValues } from '../../application/dtos/filmDtos'
import { useFilmMutations } from '../../application/mutations/filmMutations'
import { useFilmList } from '../../application/queries/filmQueries'
import { useLanguages } from '../../application/queries/lookupQueries'
import { createFilmService } from '../../application/services/filmService'
import type { Film } from '../../domain/entities/film'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../../domain/entities/pagedResult'
import type { FilmListQuery, FilmRepository } from '../../domain/ports/filmRepository'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import { FilmForm } from '../components/FilmForm'
import { FilmList } from '../components/FilmList'
import { Pagination } from '../components/Pagination'
import { errorMessage } from '../errorMessage'

type ModalState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; film: Film }

interface FilmsViewProps {
  filmRepository: FilmRepository
  lookupRepository: LookupRepository
}

/** Film catalog maintenance section (created by App when its tab is active). */
export function FilmsView({ filmRepository, lookupRepository }: FilmsViewProps) {
  const [search, setSearch] = useState('')
  // Server-side pagination: the backend slices and counts the rows.
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [modalError, setModalError] = useState<string | null>(null)
  const [pageActionError, setPageActionError] = useState<string | null>(null)
  // In-row two-step delete confirm (no blocking browser dialogs).
  const [confirmingFilmId, setConfirmingFilmId] = useState<number | null>(null)

  // Use cases are plain factories over the injected port (composition root).
  const service = useMemo(() => createFilmService(filmRepository), [filmRepository])
  const mutations = useFilmMutations(service)

  // Defer the search term so typing stays responsive while the network
  // request for the new key runs (rule rerender-use-deferred-value).
  const deferredSearch = useDeferredValue(search)

  // One cache entry per filter/page combination (rule client-swr-dedup).
  const listQuery: FilmListQuery = { search: deferredSearch || undefined, page, pageSize }
  const {
    films: filmPage,
    error: listError,
    isLoading,
    isValidating,
  } = useFilmList(filmRepository, listQuery)
  // Stale while the deferred search catches up AND while a new page/filter is
  // being fetched (keepPreviousData shows the previous slice until it arrives).
  const isStale = search !== deferredSearch || isValidating
  const languages = useLanguages(lookupRepository)

  const pageError = listError ? errorMessage(listError) : null
  const modalFilm = modal.kind === 'edit' ? modal.film : null

  // Every filter/page change restarts from the first page: the previous page
  // number may no longer exist for the new result set.
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(DEFAULT_PAGE)
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(DEFAULT_PAGE)
  }

  function openCreate() {
    setModalError(null)
    setConfirmingFilmId(null)
    setModal({ kind: 'create' })
  }

  function closeModal() {
    setModal({ kind: 'none' })
    setModalError(null)
  }

  async function handleSave(values: FilmFormValues) {
    setSaving(true)
    setModalError(null)
    try {
      if (modal.kind === 'edit') {
        await mutations.update(modal.film.filmId, values)
      } else {
        await mutations.create(values)
      }
      closeModal()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(film: Film) {
    setPageActionError(null)
    // Captured before the refetch: the row leaves this page after deletion.
    const wasOnlyRowOnPage = filmPage.items.length === 1
    try {
      await mutations.delete(film.filmId)
      setConfirmingFilmId(null)
      // Deleting the last row of a page would leave an empty page: step back.
      if (wasOnlyRowOnPage && page > 1) {
        setPage(page - 1)
      }
    } catch (error) {
      setConfirmingFilmId(null)
      // Shown at page level: a 409 conflict (film with inventory copies) lands here.
      setPageActionError(errorMessage(error))
    }
  }

  return (
    <section className="view" aria-label="Films">
      <header className="hero">
        <p className="eyebrow">Film catalog</p>
        <div className="hero-heading">
          <h2>Films</h2>
          <span className="count-badge">{filmPage.total}</span>
        </div>
        <div className="hero-bottom">
          <p className="hero-description">
            The club's catalog: register titles, adjust rental rates and replacement costs, and keep
            every field up to date.
          </p>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + New film
          </button>
        </div>
      </header>

      <section className="filters">
        <label>
          Search
          <input
            type="search"
            name="search"
            autoComplete="off"
            placeholder="Title…"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </label>
        {pageError ? <p className="error-message">{pageError}</p> : null}
        {pageActionError ? <p className="error-message">{pageActionError}</p> : null}
        <p className="toolbar-count">
          {filmPage.total} {filmPage.total === 1 ? 'film' : 'films'}
        </p>
      </section>

      <div className={isStale ? 'results results-stale' : 'results'} aria-busy={isStale}>
        <FilmList
          films={filmPage.items}
          loading={isLoading && filmPage.items.length === 0}
          confirmingFilmId={confirmingFilmId}
          onEdit={(film) => {
            setModalError(null)
            setConfirmingFilmId(null)
            setModal({ kind: 'edit', film })
          }}
          onDelete={(film) => {
            setPageActionError(null)
            setConfirmingFilmId(film.filmId)
          }}
          onConfirmDelete={(film) => void handleDelete(film)}
          onCancelConfirm={() => setConfirmingFilmId(null)}
        />
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={filmPage.total}
        totalPages={filmPage.totalPages}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        busy={isLoading || isValidating}
      />

      {modal.kind === 'create' ? (
        <FilmForm
          key="create"
          film={null}
          languages={languages}
          saving={saving}
          error={modalError}
          onSave={(values) => void handleSave(values)}
          onCancel={closeModal}
        />
      ) : null}

      {modal.kind === 'edit' && modalFilm ? (
        <FilmForm
          key={`edit-${modalFilm.filmId}`}
          film={modalFilm}
          languages={languages}
          saving={saving}
          error={modalError}
          onSave={(values) => void handleSave(values)}
          onCancel={closeModal}
        />
      ) : null}
    </section>
  )
}
