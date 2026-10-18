import { useDeferredValue, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import './App.css'
import { ApiError, fetcher } from './api'
import { PasswordForm } from './components/PasswordForm'
import { StaffForm } from './components/StaffForm'
import { StaffList } from './components/StaffList'
import { staffApi, staffKeys } from './staffApi'
import type { AddressOption, Staff, StaffCreateInput, StaffUpdateInput, StoreOption } from './types'

type ModalState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; staff: Staff }
  | { kind: 'password'; staff: Staff }

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unexpected error.'
}

export default function App() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [modalError, setModalError] = useState<string | null>(null)
  const [pageActionError, setPageActionError] = useState<string | null>(null)

  // Scoped mutate (from useSWRConfig) respects the active cache provider, so
  // revalidation always targets the cache this tree is reading from.
  const { mutate } = useSWRConfig()

  // Defer the search term so typing stays responsive while the network
  // request for the new key runs (rule rerender-use-deferred-value).
  const deferredSearch = useDeferredValue(search)
  const isStale = search !== deferredSearch
  const active = activeFilter === '' ? undefined : activeFilter === 'true'

  // One cache entry per filter combination: a slow response for an older
  // query can never overwrite results of a newer one (rule client-swr-dedup).
  const {
    data: staff = [],
    error: listError,
    isLoading,
  } = useSWR(staffKeys.list(deferredSearch || undefined, active), fetcher<Staff[]>)
  const { data: addresses = [] } = useSWR(staffKeys.addresses, fetcher<AddressOption[]>)
  const { data: stores = [] } = useSWR(staffKeys.stores, fetcher<StoreOption[]>)

  const pageError = listError ? errorMessage(listError) : null

  // Avoid re-rendering the modal content while its staff reference changes.
  const modalStaff = modal.kind === 'edit' || modal.kind === 'password' ? modal.staff : null

  function openCreate() {
    setModalError(null)
    setModal({ kind: 'create' })
  }

  function closeModal() {
    setModal({ kind: 'none' })
    setModalError(null)
  }

  async function revalidateStaffLists() {
    // Revalidate every cached staff list (any search/status combination).
    await mutate((key) => typeof key === 'string' && key.startsWith('/api/staff'))
  }

  async function handleSave(input: StaffCreateInput | StaffUpdateInput) {
    setSaving(true)
    setModalError(null)
    try {
      if (modal.kind === 'edit') {
        await staffApi.update(modal.staff.staffId, input as StaffUpdateInput)
      } else {
        await staffApi.create(input as StaffCreateInput)
      }
      closeModal()
      await revalidateStaffLists()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(newPassword: string) {
    if (modal.kind !== 'password') {
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      await staffApi.changePassword(modal.staff.staffId, newPassword)
      closeModal()
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(member: Staff) {
    setPageActionError(null)
    try {
      await staffApi.setActive(member.staffId, !member.active)
      await revalidateStaffLists()
    } catch (error) {
      // Shown at page level: this action runs without a modal.
      setPageActionError(errorMessage(error))
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Club — Staff Maintenance</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + New staff
        </button>
      </header>

      <section className="filters">
        <label>
          Search
          <input
            type="search"
            name="search"
            autoComplete="off"
            placeholder="Name, username or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            name="statusFilter"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}
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
        <StaffList
          staff={staff}
          loading={isLoading}
          onEdit={(member) => {
            setModalError(null)
            setModal({ kind: 'edit', staff: member })
          }}
          onChangePassword={(member) => {
            setModalError(null)
            setModal({ kind: 'password', staff: member })
          }}
          onToggleActive={(member) => void handleToggleActive(member)}
        />
      </div>

      {modal.kind === 'create' ? (
        <StaffForm
          key="create"
          staff={null}
          addresses={addresses}
          stores={stores}
          saving={saving}
          error={modalError}
          onSave={(input) => void handleSave(input)}
          onCancel={closeModal}
        />
      ) : null}

      {modal.kind === 'edit' && modalStaff ? (
        <StaffForm
          key={`edit-${modalStaff.staffId}`}
          staff={modalStaff}
          addresses={addresses}
          stores={stores}
          saving={saving}
          error={modalError}
          onSave={(input) => void handleSave(input)}
          onCancel={closeModal}
        />
      ) : null}

      {modal.kind === 'password' && modalStaff ? (
        <PasswordForm
          key={`password-${modalStaff.staffId}`}
          staff={modalStaff}
          saving={saving}
          error={modalError}
          onSave={(password) => void handleChangePassword(password)}
          onCancel={closeModal}
        />
      ) : null}
    </div>
  )
}
