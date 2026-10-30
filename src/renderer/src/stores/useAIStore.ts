import { create } from 'zustand'
import type {
  AIProviderConfig,
  AIModelInfo,
  CrashDiagnosticRequest,
  CrashDiagnosticReport
} from '../../../shared/ipc-types'

interface AIStore {
  config: AIProviderConfig
  isOnline: boolean | null
  latencyMs: number | null
  statusMessage: string
  availableModels: AIModelInfo[]
  isChecking: boolean
  isDiagnosing: boolean
  activeReport: CrashDiagnosticReport | null
  isDiagnosticModalOpen: boolean
  diagnosticError: string | null

  // Actions
  setConfig: (partial: Partial<AIProviderConfig>) => void
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<boolean>
  testConnection: () => Promise<void>
  listModels: () => Promise<void>
  diagnoseCrash: (request: CrashDiagnosticRequest) => Promise<CrashDiagnosticReport | null>
  openDiagnosticModal: (report?: CrashDiagnosticReport) => void
  closeDiagnosticModal: () => void
  cancelDiagnosis: () => Promise<void>
}

export const useAIStore = create<AIStore>((set, get) => ({
  config: {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'llama3:latest',
    temperature: 0.2,
    contextTokenLimit: 8192
  },
  isOnline: null,
  latencyMs: null,
  statusMessage: 'Ready to connect to local AI provider',
  availableModels: [],
  isChecking: false,
  isDiagnosing: false,
  activeReport: null,
  isDiagnosticModalOpen: false,
  diagnosticError: null,

  setConfig: (partial) => {
    set((state) => ({ config: { ...state.config, ...partial } }))
  },

  loadConfig: async () => {
    try {
      const saved = await window.nexus.ai.getConfig()
      if (saved) {
        set({ config: saved })
      }
    } catch (err) {
      console.error('Failed to load AI config:', err)
    }
  },

  saveConfig: async () => {
    try {
      const ok = await window.nexus.ai.saveConfig(get().config)
      return ok
    } catch (err) {
      console.error('Failed to save AI config:', err)
      return false
    }
  },

  testConnection: async () => {
    set({ isChecking: true, statusMessage: 'Testing connection...' })
    try {
      const res = await window.nexus.ai.testConnection(get().config)
      set({
        isOnline: res.success,
        latencyMs: res.latencyMs,
        statusMessage: res.message,
        availableModels: res.models
      })
      if (res.success && res.models.length > 0) {
        const currentModel = get().config.model
        if (!res.models.some((m) => m.id === currentModel || m.name === currentModel)) {
          set((state) => ({
            config: { ...state.config, model: res.models[0].name || res.models[0].id }
          }))
        }
      }
    } catch (err: any) {
      set({
        isOnline: false,
        latencyMs: null,
        statusMessage: err.message || 'Connection failed'
      })
    } finally {
      set({ isChecking: false })
    }
  },

  listModels: async () => {
    try {
      const models = await window.nexus.ai.listModels(get().config)
      set({ availableModels: models })
    } catch (err) {
      console.error('Failed to list models:', err)
    }
  },

  diagnoseCrash: async (request: CrashDiagnosticRequest) => {
    set({
      isDiagnosing: true,
      diagnosticError: null,
      isDiagnosticModalOpen: true
    })
    try {
      const report = await window.nexus.ai.diagnoseCrash(request)
      set({ activeReport: report, isDiagnosing: false })
      return report
    } catch (err: any) {
      set({
        isDiagnosing: false,
        diagnosticError: err?.message || 'AI diagnosis failed'
      })
      return null
    }
  },

  openDiagnosticModal: (report) => {
    set({
      isDiagnosticModalOpen: true,
      activeReport: report || get().activeReport
    })
  },

  closeDiagnosticModal: () => {
    set({ isDiagnosticModalOpen: false })
  },

  cancelDiagnosis: async () => {
    await window.nexus.ai.cancelRequest()
    set({ isDiagnosing: false })
  }
}))
