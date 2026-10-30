import { create } from 'zustand'
import type { SystemTelemetry, DatabaseHealth } from '../../../shared/ipc-types'

interface TelemetryStore {
  telemetry: SystemTelemetry | null
  dbHealth: DatabaseHealth | null
  isPolling: boolean
  lastUpdated: number | null

  startPolling: (intervalMs?: number) => () => void
  fetchOnce: () => Promise<void>
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  telemetry: null,
  dbHealth: null,
  isPolling: false,
  lastUpdated: null,

  fetchOnce: async () => {
    try {
      const [telemetry, dbHealth] = await Promise.all([
        window.nexus.telemetry.get(),
        window.nexus.database.getHealth()
      ])
      set({ telemetry, dbHealth, lastUpdated: Date.now() })
    } catch (err) {
      console.error('Telemetry fetch error:', err)
    }
  },

  startPolling: (intervalMs = 3000) => {
    get().fetchOnce()
    const timer = setInterval(() => {
      get().fetchOnce()
    }, intervalMs)

    set({ isPolling: true })

    return () => {
      clearInterval(timer)
      set({ isPolling: false })
    }
  }
}))
