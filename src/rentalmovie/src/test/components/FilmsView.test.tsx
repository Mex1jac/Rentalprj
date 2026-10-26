import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Film } from '../../domain/entities/film'
import { emptyPage } from '../../domain/entities/pagedResult'
import type { Rental } from '../../domain/entities/rental'
import { ConflictError } from '../../domain/errors/domainErrors'
import type { FilmListQuery } from '../../domain/ports/filmRepository'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { RentalRepository } from '../../domain/ports/rentalRepository'
import type { StaffListQuery } from '../../domain/ports/staffRepository'
import App from '../../presentation/App'

const dinosaur: Film = {
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
  active: true,
}

const languages = [
  { languageId: 1, name: 'English' },
  { languageId: 2, name: 'Italian' },
]

let filmRows: Film[]

/**
 * In-memory fake for the persistence ports: the application and presentation
 * layers are tested without any transport (rule client-swr-dedup applies the
 * same way since SWR still caches and deduplicates these calls).
 */
function createFilmRepository() {
  return {
    list: vi.fn(async (query: FilmListQuery) => {
      let rows = filmRows
      if (query.search) {
        rows = rows.filter((row) => row.title.toLowerCase().includes(query.search!.toLowerCase()))
      }
      // Mirrors the API envelope: slice only when a page size is requested.
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? rows.length
      const offset = (page - 1) * Math.max(pageSize, 1)
      return {
        items: pageSize > 0 ? rows.slice(offset, offset + pageSize) : [],
        page,
        pageSize,
        total: rows.length,
        totalPages: pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1,
      }
    }),
    create: vi.fn(async (data) => {
      const created: Film = {
        ...dinosaur,
        filmId: 1099,
        ...data,
        language: 'English',
        originalLanguage: null,
        totalCopies: data.copiesPerStore * 2,
      }
      filmRows = [...filmRows, created]
      return created
    }),
    update: vi.fn(async (filmId: number, data) => {
      filmRows = filmRows.map((row) => (row.filmId === filmId ? { ...row, ...data } : row))
      return filmRows.find((row) => row.filmId === filmId)!
    }),
    setActive: vi.fn(async (filmId: number, active: boolean) => {
      filmRows = filmRows.map((row) => (row.filmId === filmId ? { ...row, active } : row))
    }),
    delete: vi.fn(async (filmId: number) => {
      filmRows = filmRows.filter((row) => row.filmId !== filmId)
    }),
  }
}

/** The staff tab mounts first (and the rentals tab needs staff too). */
function createStaffRepository() {
  return {
    getAll: vi.fn(async (_query: StaffListQuery) => []),
    create: vi.fn(async () => {
      throw new Error('not used in this suite')
    }),
    update: vi.fn(async () => {
      throw new Error('not used in this suite')
    }),
    changePassword: vi.fn(async () => undefined),
    setActive: vi.fn(async () => undefined),
  }
}

function createLookupRepository(): LookupRepository {
  return {
    getAddresses: vi.fn(async () => []),
    getStores: vi.fn(async () => []),
    getFilms: vi.fn(async () => []),
    getLanguages: vi.fn(async () => languages),
  }
}

function renderApp() {
  const filmRepository = createFilmRepository()
  const staffRepository = createStaffRepository()
  const lookupRepository = createLookupRepository()
  const rentalRepository = {
    list: vi.fn(async () => emptyPage<Rental>(1, 25)),
    create: vi.fn(async () => []),
    markReturned: vi.fn(async () => {
      throw new Error('not used in this suite')
    }),
  } satisfies RentalRepository

  // A fresh cache provider per render keeps tests isolated (client-swr-dedup).
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <App
        repository={staffRepository}
        lookupRepository={lookupRepository}
        rentalRepository={rentalRepository}
        filmRepository={filmRepository}
      />
    </SWRConfig>,
  )
  return { filmRepository, staffRepository, lookupRepository, rentalRepository }
}

beforeEach(() => {
  filmRows = [dinosaur]
})

describe('Films view', () => {
  it('lists the catalog after switching to the Films tab', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: 'Films' }))

    expect(await screen.findByText('ACADEMY DINOSAUR')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Films' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('table')).getByText('PG')).toBeInTheDocument()
  })

  it('registers a film through the service and refreshes the list', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    await user.click(screen.getByRole('button', { name: '+ New film' }))
    await user.type(screen.getByLabelText('Title'), 'New Adventures')
    await user.selectOptions(screen.getByLabelText('Language'), '1')
    // The field starts with the default '1': clear it before typing.
    await user.clear(screen.getByLabelText('Copies per store'))
    await user.type(screen.getByLabelText('Copies per store'), '2')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    // The service normalizes before the port is touched.
    await waitFor(() =>
      expect(filmRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Adventures',
          languageId: 1,
          rentalDurationDays: 3,
          copiesPerStore: 2,
        }),
      ),
    )
    expect(await screen.findByText('New Adventures')).toBeInTheDocument()
  })

  it('edits a film through the service (rate and cost included)', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    const row = screen.getByText('ACADEMY DINOSAUR').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Edit' }))

    await user.clear(screen.getByLabelText('Rental rate'))
    await user.type(screen.getByLabelText('Rental rate'), '5.99')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(filmRepository.update).toHaveBeenCalledWith(
        1001,
        expect.objectContaining({ rentalRate: 5.99, title: 'ACADEMY DINOSAUR' }),
      ),
    )
    expect(await within(screen.getByRole('table')).findByText('5.99')).toBeInTheDocument()
  })

  it('requires a two-step confirm before deleting a film', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    const row = screen.getByText('ACADEMY DINOSAUR').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))

    // First click only arms the confirmation: nothing was deleted yet.
    expect(within(row!).getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()
    expect(filmRepository.delete).not.toHaveBeenCalled()

    await user.click(within(row!).getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => expect(filmRepository.delete).toHaveBeenCalledWith(1001))
    expect(await screen.findByText('No films found.')).toBeInTheDocument()
  })

  it('cancels the delete confirmation without touching the repository', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    const row = screen.getByText('ACADEMY DINOSAUR').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(within(row!).getByRole('button', { name: 'Cancel' }))

    expect(within(row!).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(filmRepository.delete).not.toHaveBeenCalled()
  })

  it('surfaces a delete conflict at page level (409: film with inventory copies)', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    filmRepository.delete.mockImplementationOnce(async () => {
      throw new ConflictError(
        'Film with id 1001 has 4 copies in inventory and cannot be deleted.',
      )
    })
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    const row = screen.getByText('ACADEMY DINOSAUR').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(within(row!).getByRole('button', { name: 'Confirm delete' }))

    expect(
      await screen.findByText('Film with id 1001 has 4 copies in inventory and cannot be deleted.'),
    ).toBeInTheDocument()
    // The row stays listed: the film was not deleted.
    expect(screen.getByText('ACADEMY DINOSAUR')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('surfaces a create conflict in the modal and keeps it open', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    filmRepository.create.mockImplementationOnce(async () => {
      throw new ConflictError('Language with id 9 does not exist.')
    })
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    await user.click(screen.getByRole('button', { name: '+ New film' }))
    await user.type(screen.getByLabelText('Title'), 'Dup Film')
    await user.selectOptions(screen.getByLabelText('Language'), '1')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Language with id 9 does not exist.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /new film/i })).toBeInTheDocument()
  })

  it('passes the deferred search term to the repository', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    await user.type(screen.getByLabelText('Search'), 'dino')

    await waitFor(() =>
      expect(filmRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'dino', page: 1, pageSize: 25 }),
      ),
    )
  })
})

describe('Films view pagination', () => {
  beforeEach(() => {
    // 30 rows: two full pages of 25 plus a short second page.
    filmRows = Array.from({ length: 30 }, (_, index) => ({
      ...dinosaur,
      filmId: index + 1,
      title: `Film ${index + 1}`,
    }))
  })

  it('starts on page 1 with 25 rows and moves to the second slice', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: 'Films' }))
    expect(await screen.findByText('Film 1')).toBeInTheDocument()

    expect(screen.getByText('1–25 of 30 · Page 1 of 2')).toBeInTheDocument()
    expect(screen.queryByText('Film 30')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('26–30 of 30 · Page 2 of 2')).toBeInTheDocument()
    expect(await screen.findByText('Film 30')).toBeInTheDocument()
    expect(screen.queryByText('Film 1')).not.toBeInTheDocument()
  })

  it('steps back one page when the only row of a page is deleted', async () => {
    const user = userEvent.setup()
    renderApp()
    // 11 rows at 10 per page: page 2 holds exactly one film.
    filmRows = Array.from({ length: 11 }, (_, index) => ({
      ...dinosaur,
      filmId: index + 1,
      title: `Film ${index + 1}`,
    }))

    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await user.selectOptions(screen.getByLabelText('Rows per page'), '10')
    expect(await screen.findByText('1–10 of 11 · Page 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('11–11 of 11 · Page 2 of 2')).toBeInTheDocument()

    const row = screen.getByText('Film 11').closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(within(row!).getByRole('button', { name: 'Confirm delete' }))

    // The only row of page 2 is gone, so the view steps back to page 1.
    expect(await screen.findByText('1–10 of 10 · Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Film 1')).toBeInTheDocument()
  })
})

describe('Films view status (logical leave, backlog #8)', () => {
  it('shows the Active badge for an active film', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))

    const row = (await screen.findByText('ACADEMY DINOSAUR')).closest('tr')!
    expect(within(row).getByText('Active')).toBeInTheDocument()
    expect(row).not.toHaveClass('row-inactive')
  })

  it('passes the status filter to the repository', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    await user.selectOptions(screen.getByLabelText('Status'), 'inactive')

    await waitFor(() =>
      expect(filmRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inactive', page: 1 }),
      ),
    )
  })

  it('deactivates a film: badge flips and the port receives active=false', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    const row = screen.getByText('ACADEMY DINOSAUR').closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(filmRepository.setActive).toHaveBeenCalledWith(1001, false))
    expect(await within(screen.getByRole('table')).findByText('Inactive')).toBeInTheDocument()
  })

  it('reactivates an inactive film through the same toggle', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    filmRows = [{ ...dinosaur, active: false }]
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    const row = screen.getByText('ACADEMY DINOSAUR').closest('tr')!
    expect(within(row).getByText('Inactive')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Reactivate' }))

    await waitFor(() => expect(filmRepository.setActive).toHaveBeenCalledWith(1001, true))
  })

  it('surfaces a deactivate error at page level without a modal', async () => {
    const user = userEvent.setup()
    const { filmRepository } = renderApp()
    filmRepository.setActive.mockImplementationOnce(async () => {
      throw new ConflictError('Film with id 1001 was not found.')
    })
    await user.click(screen.getByRole('tab', { name: 'Films' }))
    await screen.findByText('ACADEMY DINOSAUR')

    const row = screen.getByText('ACADEMY DINOSAUR').closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByText('Film with id 1001 was not found.')).toBeInTheDocument()
    // The row keeps its previous state: the toggle failed.
    expect(within(screen.getByRole('table')).getByText('Active')).toBeInTheDocument()
  })
})
