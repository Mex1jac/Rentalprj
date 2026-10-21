import { useDeferredValue, useMemo, useState } from 'react'
import type { RentalFormValues } from '../../application/dtos/rentalDtos'
import { useRentalMutations } from '../../application/mutations/rentalMutations'
import { useCustomerList } from '../../application/queries/customerQueries'
import { useFilms, useStores } from '../../application/queries/lookupQueries'
import { useRentalList } from '../../application/queries/rentalQueries'
import { useStaffList } from '../../application/queries/staffQueries'
import { createRentalService } from '../../application/services/rentalService'
import type { Rental, RentalStatus } from '../../domain/entities/rental'
import type { CustomerRepository } from '../../domain/ports/customerRepository'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { RentalListQuery, RentalRepository } from '../../domain/ports/rentalRepository'
import type { StaffRepository } from '../../domain/ports/staffRepository'
import { RentalCreateForm } from '../components/RentalCreateForm'
import { RentalList } from '../components/RentalList'
import { errorMessage } from '../errorMessage'

interface RentalsViewProps {
  rentalRepository: RentalRepository
  customerRepository: CustomerRepository
  staffRepository: StaffRepository
  lookupRepository: LookupRepository
}

/** Rentals tracking section (created by App when its tab is active). */
export function RentalsView({
  rentalRepository,
  customerRepository,
  staffRepository,
  lookupRepository,
}: RentalsViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RentalStatus>('open')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pageActionError, setPageActionError] = useState<string | null>(null)

  // The store chosen inside the create modal drives its film lookup.
  const [pendingStoreId, setPendingStoreId] = useState('')

  // Use cases are plain factories over the injected port (composition root).
  const service = useMemo(() => createRentalService(rentalRepository), [rentalRepository])
  const mutations = useRentalMutations(service)

  // Defer the search term so typing stays responsive while the network
  // request for the new key runs (rule rerender-use-deferred-value).
  const deferredSearch = useDeferredValue(search)
  const isStale = search !== deferredSearch

  // One cache entry per filter combination (rule client-swr-dedup).
  const listQuery: RentalListQuery = { search: deferredSearch || undefined, status: statusFilter }
  const { rentals, error: listError, isLoading } = useRentalList(rentalRepository, listQuery)

  // Picker data for the create modal (active parties only).
  const { customers } = useCustomerList(customerRepository, { active: true })
  const { staff } = useStaffList(staffRepository, { active: true })
  const stores = useStores(lookupRepository)
  const { films, isLoading: filmsLoading } = useFilms(lookupRepository, pendingStoreId)

  const pageError = listError ? errorMessage(listError) : null

  function openCreate() {
    setModalError(null)
    setPendingStoreId('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalError(null)
  }

  async function handleCreate(values: RentalFormValues) {
    setSaving(true)
    setModalError(null)
    try {
      await mutations.create(values)
      closeModal()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleReturn(rental: Rental) {
    setPageActionError(null)
    try {
      await mutations.returnRental(rental.rentalId)
    } catch (error) {
      // Shown at page level: this action runs without a modal.
      setPageActionError(errorMessage(error))
    }
  }

  return (
    <section className="view" aria-label="Rentals">
      <div className="view-toolbar">
        <h2>Rentals</h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + New rental
        </button>
      </div>

      <section className="filters">
        <label>
          Search
          <input
            type="search"
            name="search"
            autoComplete="off"
            placeholder="Customer or film title..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            name="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RentalStatus)}
          >
            <option value="open">Open</option>
            <option value="returned">Returned</option>
            <option value="all">All</option>
          </select>
        </label>
      </section>

      {pageError ? <p className="error-message">{pageError}</p> : null}
      {pageActionError ? <p className="error-message">{pageActionError}</p> : null}

      <div className={isStale ? 'results-stale' : undefined} aria-busy={isStale}>
        <RentalList rentals={rentals} loading={isLoading} onReturn={(rental) => void handleReturn(rental)} />
      </div>

      {modalOpen ? (
        <RentalCreateForm
          key="create"
          customers={customers}
          staff={staff}
          stores={stores}
          films={films}
          filmsLoading={filmsLoading}
          storeId={pendingStoreId}
          onStoreChange={setPendingStoreId}
          saving={saving}
          error={modalError}
          onSave={(values) => void handleCreate(values)}
          onCancel={closeModal}
        />
      ) : null}
    </section>
  )
}
