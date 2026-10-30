import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { exec } from 'child_process'
import { z } from 'zod'
import {
  IPC_CHANNELS,
  CreateProjectInputSchema,
  CreateLaunchProfileInputSchema,
  StartProcessInputSchema,
  PingEndpointInputSchema,
  AIProviderConfigSchema,
  CrashDiagnosticRequestSchema,
  PreparePatchInputSchema,
  ApplyPatchInputSchema
} from '../../shared/ipc-types'
import {
  ProjectRepository,
  LaunchProfileRepository,
  SettingsRepository,
  getDatabaseHealth
} from '../database/connection'
import { ProjectScanner } from '../services/ProjectScanner'
import { ConfigInspector } from '../services/ConfigInspector'
import { GitInspector } from '../services/GitInspector'
import { EnvResolver } from '../services/EnvResolver'
import { PortManager } from '../services/PortManager'
import { TelemetryService } from '../services/Telemetry'
import { ProcessManager } from '../processes/ProcessManager'
import { ProviderFactory } from '../ai/ProviderFactory'
import { DiagnosticsEngine } from '../ai/DiagnosticsEngine'
import { PatchEngine } from '../ai/PatchEngine'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  const processManager = ProcessManager.getInstance()
  processManager.setWindow(mainWindow)

  // ==========================================
  // Hardware Telemetry
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.GET_TELEMETRY, async () => {
    return TelemetryService.getTelemetry()
  })

  // ==========================================
  // Settings Management
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.GET_SETTING, async (_, key: string, defaultValue?: any) => {
    z.string().parse(key)
    return SettingsRepository.get(key, defaultValue)
  })

  ipcMain.handle(IPC_CHANNELS.SET_SETTING, async (_, key: string, value: any) => {
    z.string().parse(key)
    return SettingsRepository.set(key, value)
  })

  ipcMain.handle(IPC_CHANNELS.GET_ALL_SETTINGS, async () => {
    return SettingsRepository.getAll()
  })

  // ==========================================
  // Database Health
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.GET_DB_HEALTH, async () => {
    return getDatabaseHealth()
  })

  // ==========================================
  // System Utilities & Tool Launchers
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_, targetPath: string) => {
    z.string().parse(targetPath)
    await shell.openPath(targetPath)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_VSCODE, async (_, targetPath: string) => {
    z.string().parse(targetPath)
    return new Promise((resolve) => {
      exec(`code "${targetPath}"`, (err) => {
        if (err) {
          shell.openPath(targetPath)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL_URL, async (_, url: string) => {
    z.string().parse(url)
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        await shell.openExternal(url)
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to open external URL:', err)
      return false
    }
  })

  // ==========================================
  // Projects CRUD & Smart Scanner
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async () => {
    return ProjectRepository.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_BY_ID, async (_, id: string) => {
    z.string().parse(id)
    return ProjectRepository.getById(id)
  })

  ipcMain.handle(IPC_CHANNELS.INSPECT_PATH, async (_, path: string) => {
    z.string().parse(path)
    return ProjectScanner.inspectDirectory(path)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_DIRECTORY, async (_, directoryPath: string) => {
    z.string().parse(directoryPath)
    return ProjectScanner.scanParentDirectory(directoryPath)
  })

  ipcMain.handle(IPC_CHANNELS.CREATE_PROJECT, async (_, rawInput) => {
    const input = CreateProjectInputSchema.parse(rawInput)

    const scanned = ProjectScanner.inspectDirectory(input.path)
    if (scanned && scanned.pythonVenvPath && !input.python_venv_path) {
      input.python_venv_path = scanned.pythonVenvPath
    }

    const project = ProjectRepository.create(input)

    if (scanned && scanned.suggestedProfiles && scanned.suggestedProfiles.length > 0) {
      for (const p of scanned.suggestedProfiles) {
        LaunchProfileRepository.create({
          project_id: project.id,
          name: p.name,
          command: p.command,
          args: p.args,
          cwd: project.path,
          env: {},
          auto_open_preview: Boolean(p.autoOpenPreview),
          is_default: Boolean(p.isDefault)
        })
      }
    }

    return project
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, async (_, id: string, rawInput) => {
    z.string().parse(id)
    const input = CreateProjectInputSchema.partial().parse(rawInput)
    return ProjectRepository.update(id, input)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_PROJECT, async (_, id: string) => {
    z.string().parse(id)
    return ProjectRepository.delete(id)
  })

  // ==========================================
  // Launch Profiles CRUD & Compound Stacks
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.GET_LAUNCH_PROFILES, async (_, projectId: string) => {
    z.string().parse(projectId)
    return LaunchProfileRepository.getByProjectId(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.CREATE_LAUNCH_PROFILE, async (_, rawInput) => {
    const input = CreateLaunchProfileInputSchema.parse(rawInput)
    return LaunchProfileRepository.create(input)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_LAUNCH_PROFILE, async (_, id: string, rawInput) => {
    z.string().parse(id)
    const input = CreateLaunchProfileInputSchema.partial().parse(rawInput)
    return LaunchProfileRepository.update(id, input)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_LAUNCH_PROFILE, async (_, id: string) => {
    z.string().parse(id)
    return LaunchProfileRepository.delete(id)
  })

  ipcMain.handle(IPC_CHANNELS.LAUNCH_COMPOUND, async (_, profileIds: string[]) => {
    z.array(z.string()).parse(profileIds)
    const startedProcesses: any[] = []

    const allProjects = ProjectRepository.getAll()
    for (const pid of profileIds) {
      for (const proj of allProjects) {
        const pList = LaunchProfileRepository.getByProjectId(proj.id)
        const match = pList.find((p) => p.id === pid)
        if (match) {
          const proc = await processManager.start({
            projectId: proj.id,
            profileId: match.id
          })
          startedProcesses.push(proc)
          break
        }
      }
    }
    return startedProcesses
  })

  // ==========================================
  // Process Lifecycle & Interactive Terminal
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.START_PROCESS, async (_, rawInput) => {
    const input = StartProcessInputSchema.parse(rawInput)
    return processManager.start(input)
  })

  ipcMain.handle(IPC_CHANNELS.STOP_PROCESS, async (_, processId: string) => {
    z.string().parse(processId)
    return processManager.stop(processId)
  })

  ipcMain.handle(IPC_CHANNELS.RESTART_PROCESS, async (_, processId: string) => {
    z.string().parse(processId)
    return processManager.restart(processId)
  })

  ipcMain.handle(IPC_CHANNELS.GET_RUNNING_PROCESSES, async () => {
    return processManager.getRunning()
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_INPUT, async (_, processId: string, data: string) => {
    z.string().parse(processId)
    z.string().parse(data)
    return processManager.sendInput(processId, data)
  })

  ipcMain.handle(IPC_CHANNELS.SPAWN_SHELL, async (_, projectId?: string) => {
    if (projectId) z.string().parse(projectId)
    return processManager.spawnShell(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.PING_ENDPOINT, async (_, rawInput) => {
    const validated = PingEndpointInputSchema.parse(rawInput)
    const startTime = performance.now()
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), validated.timeoutMs || 10000)

      const headers: Record<string, string> = {
        'User-Agent': 'Nexus-Launcher-Inspector/1.0',
        ...(validated.headers || {})
      }
      if (validated.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(validated.url, {
        method: validated.method,
        headers,
        body: ['GET', 'HEAD'].includes(validated.method) ? undefined : validated.body,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const latencyMs = Math.round(performance.now() - startTime)
      const text = await response.text()

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((v, k) => {
        responseHeaders[k] = v
      })

      let isJson = false
      try {
        JSON.parse(text)
        isJson = true
      } catch {
        isJson = false
      }

      return {
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        headers: responseHeaders,
        data: text,
        isJson
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime)
      return {
        status: 0,
        statusText: err.name === 'AbortError' ? 'Timeout' : 'Network Error',
        latencyMs,
        headers: {},
        data: '',
        isJson: false,
        error: err.message || String(err)
      }
    }
  })

  // ==========================================
  // Port Inspection & Stuck Port Killing
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.CHECK_PORT, async (_, port: number) => {
    z.number().int().min(1).max(65535).parse(port)
    return PortManager.getProcessHoldingPort(port)
  })

  ipcMain.handle(IPC_CHANNELS.GET_ALL_LISTENING_PORTS, async () => {
    return PortManager.getAllListeningPorts()
  })

  ipcMain.handle(IPC_CHANNELS.KILL_PORT, async (_, port: number) => {
    z.number().int().min(1).max(65535).parse(port)
    return PortManager.killPort(port)
  })

  ipcMain.handle(IPC_CHANNELS.KILL_PID, async (_, pid: number) => {
    z.number().int().min(1).parse(pid)
    return PortManager.killPid(pid)
  })

  // ==========================================
  // Config & File Tree Inspector
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.GET_PROJECT_CONFIG_FILES, async (_, projectPath: string) => {
    z.string().parse(projectPath)
    return ConfigInspector.getProjectConfigFiles(projectPath)
  })

  ipcMain.handle(IPC_CHANNELS.READ_FILE_CONTENT, async (_, filePath: string) => {
    z.string().parse(filePath)
    return ConfigInspector.readFileContent(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.GET_DIRECTORY_TREE, async (_, projectPath: string, maxDepth?: number) => {
    z.string().parse(projectPath)
    return ConfigInspector.getDirectoryTree(projectPath, 0, maxDepth ?? 4)
  })

  // ==========================================
  // Git & Environment
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.GET_GIT_STATUS, async (_, projectPath: string) => {
    z.string().parse(projectPath)
    return GitInspector.getStatus(projectPath)
  })

  ipcMain.handle(IPC_CHANNELS.GET_ENV_VARS, async (_, projectPath: string) => {
    z.string().parse(projectPath)
    return EnvResolver.getProjectEnv(projectPath)
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_ENV_FILE, async (_, projectPath: string, fileName: string, vars: any) => {
    z.string().parse(projectPath)
    z.string().parse(fileName)
    z.record(z.string()).parse(vars)
    return EnvResolver.saveProjectEnv(projectPath, fileName, vars)
  })

  // ==========================================
  // Local-First AI Architecture & Diagnostics
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async (_, rawConfig) => {
    const config = AIProviderConfigSchema.parse(rawConfig)
    const adapter = ProviderFactory.getAdapter(config.provider)
    return adapter.testConnection(config)
  })

  ipcMain.handle(IPC_CHANNELS.AI_LIST_MODELS, async (_, rawConfig) => {
    const config = AIProviderConfigSchema.parse(rawConfig)
    const adapter = ProviderFactory.getAdapter(config.provider)
    return adapter.listModels(config)
  })

  ipcMain.handle(IPC_CHANNELS.AI_GET_CONFIG, async () => {
    return DiagnosticsEngine.getConfig()
  })

  ipcMain.handle(IPC_CHANNELS.AI_SAVE_CONFIG, async (_, rawConfig) => {
    const config = AIProviderConfigSchema.parse(rawConfig)
    return DiagnosticsEngine.saveConfig(config)
  })

  ipcMain.handle(IPC_CHANNELS.AI_DIAGNOSE_CRASH, async (_, rawRequest) => {
    const request = CrashDiagnosticRequestSchema.parse(rawRequest)
    return DiagnosticsEngine.diagnose(request)
  })

  ipcMain.handle(IPC_CHANNELS.AI_CANCEL_REQUEST, async () => {
    return DiagnosticsEngine.cancelCurrent()
  })

  // ==========================================
  // Patch Engine & Human-in-the-Loop Code Repair
  // ==========================================
  ipcMain.handle(IPC_CHANNELS.PATCH_PREPARE, async (_, rawInput) => {
    const input = PreparePatchInputSchema.parse(rawInput)
    return PatchEngine.preparePatch(input)
  })

  ipcMain.handle(IPC_CHANNELS.PATCH_APPLY, async (_, rawInput) => {
    const input = ApplyPatchInputSchema.parse(rawInput)
    return PatchEngine.applyPatch(input)
  })

  ipcMain.handle(IPC_CHANNELS.PATCH_ROLLBACK, async (_, patchRecordId: string) => {
    z.string().parse(patchRecordId)
    return PatchEngine.rollbackPatch(patchRecordId)
  })

  ipcMain.handle(IPC_CHANNELS.PATCH_GET_HISTORY, async (_, projectId: string) => {
    z.string().parse(projectId)
    return PatchEngine.getHistory(projectId)
  })
}
