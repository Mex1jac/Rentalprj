import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { ApiError } from './api'
import { PasswordForm } from './components/PasswordForm'
import { StaffForm } from './components/StaffForm'
import { StaffList } from './components/StaffList'
import { lookupApi, staffApi } from './staffApi'
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
  const [staff, setStaff] = useState<Staff[]>([])
  const [addresses, setAddresses] = useState<AddressOption[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [modalError, setModalError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')

  const loadStaff = useCallback(async () => {
    setLoading(true)
    try {
      const active = activeFilter === '' ? undefined : activeFilter === 'true'
      setStaff(await staffApi.list(search || undefined, active))
      setPageError(null)
    } catch (error) {
      setPageError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [search, activeFilter])

  useEffect(() => {
    void loadStaff()
  }, [loadStaff])

  // Lookups are loaded once: they feed the form selects.
  useEffect(() => {
    void (async () => {
      try {
        const [addressList, storeList] = await Promise.all([lookupApi.addresses(), lookupApi.stores()])
        setAddresses(addressList)
        setStores(storeList)
      } catch (error) {
        setPageError(errorMessage(error))
      }
    })()
  }, [])

  function openCreate() {
    setModalError(null)
    setModal({ kind: 'create' })
  }

  function closeModal() {
    setModal({ kind: 'none' })
    setModalError(null)
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
      await loadStaff()
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
    try {
      await staffApi.setActive(member.staffId, !member.active)
      await loadStaff()
    } catch (error) {
      setPageError(errorMessage(error))
    }
  }

  // Avoid re-rendering the modal content while its staff reference changes.
  const modalStaff =
    modal.kind === 'edit' || modal.kind === 'password' ? modal.staff : null

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
            placeholder="Name, username or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <button type="button" className="btn btn-secondary" onClick={() => void loadStaff()}>
          Refresh
        </button>
      </section>

      {pageError && <p className="error-message">{pageError}</p>}

      <StaffList
        staff={staff}
        loading={loading}
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

      {modal.kind === 'create' && (
        <StaffForm
          staff={null}
          addresses={addresses}
          stores={stores}
          saving={saving}
          error={modalError}
          onSave={(input) => void handleSave(input)}
          onCancel={closeModal}
        />
      )}

      {modal.kind === 'edit' && modalStaff && (
        <StaffForm
          staff={modalStaff}
          addresses={addresses}
          stores={stores}
          saving={saving}
          error={modalError}
          onSave={(input) => void handleSave(input)}
          onCancel={closeModal}
        />
      )}

      {modal.kind === 'password' && modalStaff && (
        <PasswordForm
          staff={modalStaff}
          saving={saving}
          error={modalError}
          onSave={(password) => void handleChangePassword(password)}
          onCancel={closeModal}
        />
      )}
    </div>
  )
}
