import { useDeferredValue, useMemo, useState } from 'react'
import type { CustomerFormValues } from '../../application/dtos/customerDtos'
import { useCustomerMutations } from '../../application/mutations/customerMutations'
import { useAddresses, useStores } from '../../application/queries/lookupQueries'
import { useCustomerList } from '../../application/queries/customerQueries'
import { createCustomerService } from '../../application/services/customerService'
import type { Customer } from '../../domain/entities/customer'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../../domain/entities/pagedResult'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { CustomerListQuery, CustomerRepository } from '../../domain/ports/customerRepository'
import { CustomerForm } from '../components/CustomerForm'
import { CustomerList } from '../components/CustomerList'
import { Pagination } from '../components/Pagination'
import { errorMessage } from '../errorMessage'

type ModalState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; customer: Customer }

interface CustomersViewProps {
  customerRepository: CustomerRepository
  lookupRepository: LookupRepository
}

/** Members (socios) maintenance section (created by App when its tab is active). */
export function CustomersView({ customerRepository, lookupRepository }: CustomersViewProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  // Server-side pagination: the backend slices and counts the rows.
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [modalError, setModalError] = useState<string | null>(null)
  const [pageActionError, setPageActionError] = useState<string | null>(null)

  // Use cases are plain factories over the injected port (composition root).
  const service = useMemo(() => createCustomerService(customerRepository), [customerRepository])
  const mutations = useCustomerMutations(service)

  // Defer the search term so typing stays responsive while the network
  // request for the new key runs (rule rerender-use-deferred-value).
  const deferredSearch = useDeferredValue(search)
  const active = activeFilter === '' ? undefined : activeFilter === 'true'

  // One cache entry per filter/page combination (rule client-swr-dedup).
  const listQuery: CustomerListQuery = { search: deferredSearch || undefined, active, page, pageSize }
  const {
    customers: customerPage,
    error: listError,
    isLoading,
    isValidating,
  } = useCustomerList(customerRepository, listQuery)
  // Stale while the deferred search catches up AND while a new page/filter is
  // being fetched (keepPreviousData shows the previous slice until it arrives).
  const isStale = search !== deferredSearch || isValidating
  const addresses = useAddresses(lookupRepository)
  const stores = useStores(lookupRepository)

  const pageError = listError ? errorMessage(listError) : null
  const modalCustomer = modal.kind === 'edit' ? modal.customer : null

  // Every filter/page change restarts from the first page: the previous page
  // number may no longer exist for the new result set.
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(DEFAULT_PAGE)
  }

  function handleFilterChange(value: typeof activeFilter) {
    setActiveFilter(value)
    setPage(DEFAULT_PAGE)
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(DEFAULT_PAGE)
  }

  function openCreate() {
    setModalError(null)
    setModal({ kind: 'create' })
  }

  function closeModal() {
    setModal({ kind: 'none' })
    setModalError(null)
  }

  async function handleSave(values: CustomerFormValues) {
    setSaving(true)
    setModalError(null)
    try {
      if (modal.kind === 'edit') {
        await mutations.update(modal.customer.customerId, values)
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

  async function handleToggleActive(member: Customer) {
    setPageActionError(null)
    // Captured before the refetch: the row may leave the current filter.
    const wasOnlyRowOnPage = customerPage.items.length === 1
    try {
      await mutations.setActive(member)
      // Deactivating while filtering "Active" removes the row from this view:
      // if it was the last one on the page, step back instead of showing an
      // empty page.
      if (member.active && activeFilter === 'true' && wasOnlyRowOnPage && page > 1) {
        setPage(page - 1)
      }
    } catch (error) {
      // Shown at page level: this action runs without a modal.
      setPageActionError(errorMessage(error))
    }
  }

  return (
    <section className="view" aria-label="Customers">
      <div className="view-toolbar">
        <h2>Members (customers)</h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + New customer
        </button>
      </div>

      <section className="filters">
        <label>
          Search
          <input
            type="search"
            name="search"
            autoComplete="off"
            placeholder="Name or email..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            name="statusFilter"
            value={activeFilter}
            onChange={(event) => handleFilterChange(event.target.value as typeof activeFilter)}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </section>

      {pageError ? <p className="error-message">{pageError}</p> : null}
      {pageActionError ? <p className="error-message">{pageActionError}</p> : null}

      <div className={isStale ? 'results-stale' : undefined} aria-busy={isStale}>
        <CustomerList
          customers={customerPage.items}
          loading={isLoading && customerPage.items.length === 0}
          onEdit={(member) => {
            setModalError(null)
            setModal({ kind: 'edit', customer: member })
          }}
          onToggleActive={(member) => void handleToggleActive(member)}
        />
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={customerPage.total}
        totalPages={customerPage.totalPages}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        busy={isLoading || isValidating}
      />

      {modal.kind === 'create' ? (
        <CustomerForm
          key="create"
          customer={null}
          addresses={addresses}
          stores={stores}
          saving={saving}
          error={modalError}
          onSave={(values) => void handleSave(values)}
          onCancel={closeModal}
        />
      ) : null}

      {modal.kind === 'edit' && modalCustomer ? (
        <CustomerForm
          key={`edit-${modalCustomer.customerId}`}
          customer={modalCustomer}
          addresses={addresses}
          stores={stores}
          saving={saving}
          error={modalError}
          onSave={(values) => void handleSave(values)}
          onCancel={closeModal}
        />
      ) : null}
    </section>
  )
}
