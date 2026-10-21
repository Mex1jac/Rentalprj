import { useState } from 'react'
import './App.css'
import type { CustomerRepository } from '../domain/ports/customerRepository'
import type { LookupRepository } from '../domain/ports/lookupRepository'
import type { RentalRepository } from '../domain/ports/rentalRepository'
import type { StaffRepository } from '../domain/ports/staffRepository'
import { customerApiRepository } from '../infrastructure/persistence/customerApiRepository'
import { lookupApiRepository } from '../infrastructure/persistence/lookupApiRepository'
import { rentalApiRepository } from '../infrastructure/persistence/rentalApiRepository'
import { staffApiRepository } from '../infrastructure/persistence/staffApiRepository'
import { CustomersView } from './views/CustomersView'
import { RentalsView } from './views/RentalsView'
import { StaffView } from './views/StaffView'

type View = 'staff' | 'customers' | 'rentals'

export interface AppProps {
  /**
   * Persistence ports. The defaults are the production wiring: this
   * component is the composition root (the frontend counterpart of
   * Program.cs), so tests can inject fake ports instead of mocking fetch.
   */
  repository?: StaffRepository
  lookupRepository?: LookupRepository
  customerRepository?: CustomerRepository
  rentalRepository?: RentalRepository
}

const TABS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'staff', label: 'Staff' },
  { id: 'customers', label: 'Customers' },
  { id: 'rentals', label: 'Rentals' },
]

export default function App({
  repository = staffApiRepository,
  lookupRepository = lookupApiRepository,
  customerRepository = customerApiRepository,
  rentalRepository = rentalApiRepository,
}: AppProps) {
  const [view, setView] = useState<View>('staff')

  // Only the active section mounts: its queries run on demand and the other
  // sections keep no stale state around.
  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Club</h1>
        <nav className="app-tabs" role="tablist" aria-label="Sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={view === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={view === tab.id ? 'tab tab-active' : 'tab'}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {view === 'staff' ? (
        <div role="tabpanel" id="panel-staff" aria-labelledby="tab-staff">
          <StaffView repository={repository} lookupRepository={lookupRepository} />
        </div>
      ) : null}

      {view === 'customers' ? (
        <div role="tabpanel" id="panel-customers" aria-labelledby="tab-customers">
          <CustomersView customerRepository={customerRepository} lookupRepository={lookupRepository} />
        </div>
      ) : null}

      {view === 'rentals' ? (
        <div role="tabpanel" id="panel-rentals" aria-labelledby="tab-rentals">
          <RentalsView
            rentalRepository={rentalRepository}
            customerRepository={customerRepository}
            staffRepository={repository}
            lookupRepository={lookupRepository}
          />
        </div>
      ) : null}
    </div>
  )
}
