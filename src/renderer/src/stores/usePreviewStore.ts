import { create } from 'zustand'
import type { ServerReadyEvent } from '../../../shared/ipc-types'

export type PreviewMode = 'browser' | 'api-inspector'
export type ViewportMode = 'desktop' | 'mobile'

interface PreviewStore {
  isOpen: boolean
  width: number
  url: string
  port: number | null
  projectId: string | null
  projectName: string | null
  mode: PreviewMode
  viewport: ViewportMode
  refreshKey: number
  autoOpenEnabled: boolean

  // Actions
  setIsOpen: (isOpen: boolean) => void
  toggleOpen: () => void
  setWidth: (width: number) => void
  setUrl: (url: string) => void
  setMode: (mode: PreviewMode) => void
  setViewport: (viewport: ViewportMode) => void
  setAutoOpenEnabled: (enabled: boolean) => void
  refresh: () => void
  openForServer: (event: ServerReadyEvent, projectName?: string) => void
  initServerReadyListener: (getProjectName?: (id: string) => string | undefined) => () => void
}

export const usePreviewStore = create<PreviewStore>((set, get) => ({
  isOpen: false,
  width: 480,
  url: 'http://localhost:3000',
  port: null,
  projectId: null,
  projectName: null,
  mode: 'browser',
  viewport: 'desktop',
  refreshKey: 0,
  autoOpenEnabled: true,

  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setWidth: (width) => set({ width: Math.max(340, Math.min(width, 920)) }),
  setUrl: (url) => set({ url }),
  setMode: (mode) => set({ mode }),
  setViewport: (viewport) => set({ viewport }),
  setAutoOpenEnabled: (enabled) => set({ autoOpenEnabled: enabled }),
  refresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),

  openForServer: (event: ServerReadyEvent, projectName?: string) => {
    set({
      isOpen: true,
      url: event.url,
      port: event.port,
      projectId: event.projectId,
      projectName: projectName || `Port :${event.port}`,
      refreshKey: get().refreshKey + 1
    })
  },

  initServerReadyListener: (getProjectName) => {
    const unsub = window.nexus.process.onServerReady((event) => {
      if (get().autoOpenEnabled) {
        const name = getProjectName ? getProjectName(event.projectId) : undefined
        get().openForServer(event, name)
      }
    })
    return unsub
  }
}))
