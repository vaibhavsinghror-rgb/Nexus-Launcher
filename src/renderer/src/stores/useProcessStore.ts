import { create } from 'zustand'
import type {
  LogEntry,
  ManagedProcess,
  StartProcessInput,
  ListeningPortInfo
} from '../../../shared/ipc-types'

interface ProcessStore {
  runningProcesses: ManagedProcess[]
  logsByProcessId: Record<string, LogEntry[]>
  activeProcessId: string | null
  isTerminalOpen: boolean
  drawerHeight: number // pixels
  listeningPorts: ListeningPortInfo[]
  isLoadingPorts: boolean

  setIsTerminalOpen: (open: boolean) => void
  setDrawerHeight: (height: number) => void
  setActiveProcessId: (id: string | null) => void

  initProcessListeners: () => () => void
  loadRunningProcesses: () => Promise<void>
  startProcess: (input: StartProcessInput) => Promise<ManagedProcess>
  stopProcess: (processId: string) => Promise<boolean>
  restartProcess: (processId: string) => Promise<ManagedProcess>
  sendTerminalInput: (processId: string, data: string) => Promise<boolean>
  spawnShell: (projectId?: string) => Promise<ManagedProcess>
  clearLogs: (processId: string) => void

  fetchListeningPorts: () => Promise<void>
  killPort: (port: number) => Promise<boolean>
  killPid: (pid: number) => Promise<boolean>
}

export const useProcessStore = create<ProcessStore>((set, get) => ({
  runningProcesses: [],
  logsByProcessId: {},
  activeProcessId: null,
  isTerminalOpen: false,
  drawerHeight: 280,
  listeningPorts: [],
  isLoadingPorts: false,

  setIsTerminalOpen: (open) => set({ isTerminalOpen: open }),
  setDrawerHeight: (drawerHeight) => set({ drawerHeight }),
  setActiveProcessId: (id) => set({ activeProcessId: id }),

  initProcessListeners: () => {
    const unsubLog = window.nexus.process.onLog((log) => {
      set((state) => {
        const existing = state.logsByProcessId[log.processId] || []
        return {
          logsByProcessId: {
            ...state.logsByProcessId,
            [log.processId]: [...existing, log].slice(-1000)
          }
        }
      })
    })

    const unsubState = window.nexus.process.onStateChange((proc) => {
      set((state) => {
        const index = state.runningProcesses.findIndex((p) => p.processId === proc.processId)
        let updated: ManagedProcess[]
        if (index >= 0) {
          if (proc.status === 'stopped' || proc.status === 'crashed') {
            updated = state.runningProcesses.filter((p) => p.processId !== proc.processId)
          } else {
            updated = [...state.runningProcesses]
            updated[index] = proc
          }
        } else {
          updated =
            proc.status === 'running' || proc.status === 'starting'
              ? [...state.runningProcesses, proc]
              : state.runningProcesses
        }
        return { runningProcesses: updated }
      })
    })

    return () => {
      unsubLog()
      unsubState()
    }
  },

  loadRunningProcesses: async () => {
    try {
      const list = await window.nexus.process.getRunning()
      set({ runningProcesses: list })
      if (!get().activeProcessId && list.length > 0) {
        set({ activeProcessId: list[0].processId })
      }
    } catch (err) {
      console.error('Failed to load running processes:', err)
    }
  },

  startProcess: async (input) => {
    try {
      const proc = await window.nexus.process.start(input)
      set((state) => ({
        runningProcesses: [
          ...state.runningProcesses.filter((p) => p.processId !== proc.processId),
          proc
        ],
        activeProcessId: proc.processId,
        isTerminalOpen: true
      }))
      return proc
    } catch (err: any) {
      alert(`Process execution error: ${err.message}`)
      throw err
    }
  },

  stopProcess: async (processId) => {
    try {
      const ok = await window.nexus.process.stop(processId)
      set((state) => ({
        runningProcesses: state.runningProcesses.filter((p) => p.processId !== processId)
      }))
      return ok
    } catch (err: any) {
      console.error('Failed to stop process:', err)
      return false
    }
  },

  restartProcess: async (processId) => {
    try {
      const restarted = await window.nexus.process.restart(processId)
      set((state) => ({
        runningProcesses: [
          ...state.runningProcesses.filter((p) => p.processId !== processId),
          restarted
        ],
        activeProcessId: restarted.processId,
        isTerminalOpen: true
      }))
      return restarted
    } catch (err: any) {
      alert(`Restart error: ${err.message}`)
      throw err
    }
  },

  sendTerminalInput: async (processId, data) => {
    return window.nexus.process.sendInput(processId, data)
  },

  spawnShell: async (projectId) => {
    const proc = await window.nexus.process.spawnShell(projectId)
    set((state) => ({
      runningProcesses: [...state.runningProcesses, proc],
      activeProcessId: proc.processId,
      isTerminalOpen: true
    }))
    return proc
  },

  clearLogs: (processId) => {
    set((state) => ({
      logsByProcessId: {
        ...state.logsByProcessId,
        [processId]: []
      }
    }))
  },

  fetchListeningPorts: async () => {
    set({ isLoadingPorts: true })
    try {
      const ports = await window.nexus.process.getAllListeningPorts()
      set({ listeningPorts: ports })
    } catch (err) {
      console.error('Failed to fetch listening ports:', err)
    } finally {
      set({ isLoadingPorts: false })
    }
  },

  killPort: async (port) => {
    const ok = await window.nexus.process.killPort(port)
    await get().fetchListeningPorts()
    return ok
  },

  killPid: async (pid) => {
    const ok = await window.nexus.process.killPid(pid)
    await get().fetchListeningPorts()
    return ok
  }
}))
