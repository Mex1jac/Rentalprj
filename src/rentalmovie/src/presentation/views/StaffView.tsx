import { useDeferredValue, useMemo, useState } from 'react'
import type { StaffFormValues } from '../../application/dtos/staffDtos'
import { useStaffMutations } from '../../application/mutations/staffMutations'
import { useAddresses, useStores } from '../../application/queries/lookupQueries'
import { useStaffList } from '../../application/queries/staffQueries'
import { createStaffService } from '../../application/services/staffService'
import type { Staff } from '../../domain/entities/staff'
import type { LookupRepository } from '../../domain/ports/lookupRepository'
import type { StaffListQuery, StaffRepository } from '../../domain/ports/staffRepository'
import { PasswordForm } from '../components/PasswordForm'
import { StaffForm } from '../components/StaffForm'
import { StaffList } from '../components/StaffList'
import { errorMessage } from '../errorMessage'

type ModalState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; staff: Staff }
  | { kind: 'password'; staff: Staff }

interface StaffViewProps {
  repository: StaffRepository
  lookupRepository: LookupRepository
}

/** Staff maintenance section (created by App when its tab is active). */
export function StaffView({ repository, lookupRepository }: StaffViewProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [modalError, setModalError] = useState<string | null>(null)
  const [pageActionError, setPageActionError] = useState<string | null>(null)

  // Use cases are plain factories over the injected port (composition root).
  const service = useMemo(() => createStaffService(repository), [repository])
  const mutations = useStaffMutations(service)

  // Defer the search term so typing stays responsive while the network
  // request for the new key runs (rule rerender-use-deferred-value).
  const deferredSearch = useDeferredValue(search)
  const isStale = search !== deferredSearch
  const active = activeFilter === '' ? undefined : activeFilter === 'true'

  // One cache entry per filter combination (rule client-swr-dedup).
  const listQuery: StaffListQuery = { search: deferredSearch || undefined, active }
  const { staff, error: listError, isLoading } = useStaffList(repository, listQuery)
  const addresses = useAddresses(lookupRepository)
  const stores = useStores(lookupRepository)

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

  async function handleSave(values: StaffFormValues) {
    setSaving(true)
    setModalError(null)
    try {
      if (modal.kind === 'edit') {
        await mutations.update(modal.staff.staffId, values)
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

  async function handleChangePassword(newPassword: string) {
    if (modal.kind !== 'password') {
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      await mutations.changePassword(modal.staff.staffId, newPassword)
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
      await mutations.setActive(member)
    } catch (error) {
      // Shown at page level: this action runs without a modal.
      setPageActionError(errorMessage(error))
    }
  }

  return (
    <section className="view" aria-label="Staff maintenance">
      <header className="hero">
        <p className="eyebrow">Staff records</p>
        <div className="hero-heading">
          <h2>Staff</h2>
          <span className="count-badge">{staff.length}</span>
        </div>
        <div className="hero-bottom">
          <p className="hero-description">
            The club's counter staff: create records, manage passwords and change active status.
          </p>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + New staff
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
            placeholder="Name, username or email…"
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
        {pageError ? <p className="error-message">{pageError}</p> : null}
        {pageActionError ? <p className="error-message">{pageActionError}</p> : null}
      </section>

      <div
        className={isStale ? 'results results-end results-stale' : 'results results-end'}
        aria-busy={isStale}
      >
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
          onSave={(values) => void handleSave(values)}
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
          onSave={(values) => void handleSave(values)}
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
    </section>
  )
}
