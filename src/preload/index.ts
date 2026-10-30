import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import {
  IPC_CHANNELS,
  NexusBridge,
  LogEntry,
  ManagedProcess,
  ServerReadyEvent,
  PingEndpointInput,
  AIProviderConfig,
  CrashDiagnosticRequest,
  PreparePatchInput,
  ApplyPatchInput
} from '../shared/ipc-types'

const nexusBridge: NexusBridge = {
  telemetry: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.GET_TELEMETRY)
  },
  settings: {
    get: (key, defaultValue) => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTING, key, defaultValue),
    set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.SET_SETTING, key, value),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_SETTINGS)
  },
  database: {
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DB_HEALTH)
  },
  system: {
    openPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH, path),
    openInVsCode: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_IN_VSCODE, path),
    openExternalUrl: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, url),
    selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_DIRECTORY)
  },
  projects: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECTS),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_BY_ID, id),
    create: (data) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_PROJECT, data),
    update: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROJECT, id),
    inspectPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.INSPECT_PATH, path),
    scanDirectory: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_DIRECTORY, path)
  },
  launchProfiles: {
    getByProjectId: (projectId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_LAUNCH_PROFILES, projectId),
    create: (data) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_LAUNCH_PROFILE, data),
    update: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_LAUNCH_PROFILE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_LAUNCH_PROFILE, id),
    launchCompound: (profileIds: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_COMPOUND, profileIds)
  },
  process: {
    start: (input) => ipcRenderer.invoke(IPC_CHANNELS.START_PROCESS, input),
    stop: (processId: string) => ipcRenderer.invoke(IPC_CHANNELS.STOP_PROCESS, processId),
    restart: (processId: string) => ipcRenderer.invoke(IPC_CHANNELS.RESTART_PROCESS, processId),
    getRunning: () => ipcRenderer.invoke(IPC_CHANNELS.GET_RUNNING_PROCESSES),
    checkPort: (port: number) => ipcRenderer.invoke(IPC_CHANNELS.CHECK_PORT, port),
    getAllListeningPorts: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_LISTENING_PORTS),
    killPort: (port: number) => ipcRenderer.invoke(IPC_CHANNELS.KILL_PORT, port),
    killPid: (pid: number) => ipcRenderer.invoke(IPC_CHANNELS.KILL_PID, pid),
    sendInput: (processId: string, data: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_INPUT, processId, data),
    spawnShell: (projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.SPAWN_SHELL, projectId),
    pingEndpoint: (input: PingEndpointInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.PING_ENDPOINT, input),
    onLog: (callback: (log: LogEntry) => void) => {
      const listener = (_: IpcRendererEvent, log: LogEntry) => callback(log)
      ipcRenderer.on(IPC_CHANNELS.LOG_STREAM, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.LOG_STREAM, listener)
      }
    },
    onStateChange: (callback: (process: ManagedProcess) => void) => {
      const listener = (_: IpcRendererEvent, proc: ManagedProcess) => callback(proc)
      ipcRenderer.on(IPC_CHANNELS.PROCESS_STATE_CHANGE, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PROCESS_STATE_CHANGE, listener)
      }
    },
    onServerReady: (callback: (event: ServerReadyEvent) => void) => {
      const listener = (_: IpcRendererEvent, event: ServerReadyEvent) => callback(event)
      ipcRenderer.on(IPC_CHANNELS.SERVER_READY, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.SERVER_READY, listener)
      }
    }
  },
  config: {
    getFiles: (projectPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_CONFIG_FILES, projectPath),
    readFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE_CONTENT, filePath)
  },
  files: {
    getTree: (projectPath: string, maxDepth?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_DIRECTORY_TREE, projectPath, maxDepth)
  },
  git: {
    getStatus: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_GIT_STATUS, projectPath)
  },
  env: {
    getVars: (projectPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_ENV_VARS, projectPath),
    saveVars: (projectPath: string, fileName: string, vars: Record<string, string>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_ENV_FILE, projectPath, fileName, vars)
  },
  ai: {
    testConnection: (config: AIProviderConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_TEST_CONNECTION, config),
    listModels: (config: AIProviderConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_LIST_MODELS, config),
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_CONFIG),
    saveConfig: (config: AIProviderConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_SAVE_CONFIG, config),
    diagnoseCrash: (request: CrashDiagnosticRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_DIAGNOSE_CRASH, request),
    cancelRequest: () => ipcRenderer.invoke(IPC_CHANNELS.AI_CANCEL_REQUEST)
  },
  patches: {
    prepare: (plan: PreparePatchInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATCH_PREPARE, plan),
    apply: (patch: ApplyPatchInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATCH_APPLY, patch),
    rollback: (patchRecordId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATCH_ROLLBACK, patchRecordId),
    getHistory: (projectId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATCH_GET_HISTORY, projectId)
  }
}

contextBridge.exposeInMainWorld('nexus', nexusBridge)
