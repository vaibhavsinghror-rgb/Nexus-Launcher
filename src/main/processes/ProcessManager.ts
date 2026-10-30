import { spawn, exec, ChildProcess } from 'child_process'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import type { BrowserWindow } from 'electron'
import {
  IPC_CHANNELS,
  LogEntry,
  ManagedProcess,
  StartProcessInput,
  ServerReadyEvent
} from '../../shared/ipc-types'
import {
  ProjectRepository,
  LaunchProfileRepository,
  ProcessHistoryRepository
} from '../database/connection'
import { EnvResolver } from '../services/EnvResolver'
import { OutputParser } from './OutputParser'

interface ActiveProcessRecord {
  process: ManagedProcess
  childProcess: ChildProcess
  logBuffer: LogEntry[]
  historyId?: string
  profileId?: string
}

export class ProcessManager {
  private static instance: ProcessManager | null = null
  private activeProcesses: Map<string, ActiveProcessRecord> = new Map()
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  static getInstance(): ProcessManager {
    if (!this.instance) {
      this.instance = new ProcessManager()
    }
    return this.instance
  }

  setWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private emitLog(log: LogEntry): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.LOG_STREAM, log)
    }
  }

  private emitStateChange(proc: ManagedProcess): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.PROCESS_STATE_CHANGE, proc)
    }
  }

  private emitServerReady(event: ServerReadyEvent): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.SERVER_READY, event)
    }
  }

  appendLog(processId: string, level: LogEntry['level'], message: string): LogEntry {
    const log: LogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      processId,
      timestamp: Date.now(),
      level,
      message
    }

    const record = this.activeProcesses.get(processId)
    if (record) {
      record.logBuffer.push(log)
      if (record.logBuffer.length > 1000) {
        record.logBuffer.shift()
      }
    }

    this.emitLog(log)
    return log
  }

  getRunning(): ManagedProcess[] {
    return Array.from(this.activeProcesses.values()).map((r) => r.process)
  }

  getLogs(processId: string): LogEntry[] {
    const record = this.activeProcesses.get(processId)
    return record ? [...record.logBuffer] : []
  }

  sendInput(processId: string, data: string): boolean {
    const record = this.activeProcesses.get(processId)
    if (record && record.childProcess.stdin && !record.childProcess.stdin.destroyed) {
      record.childProcess.stdin.write(data)
      return true
    }
    return false
  }

  /**
   * Spawns an interactive PowerShell session at the project directory.
   */
  async spawnShell(projectId?: string): Promise<ManagedProcess> {
    let cwd = process.cwd()
    let projectName = 'System Shell'

    if (projectId) {
      const proj = ProjectRepository.getById(projectId)
      if (proj && existsSync(proj.path)) {
        cwd = proj.path
        projectName = `${proj.name} (Shell)`
      }
    }

    const processId = 'shell_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)

    const managedProcess: ManagedProcess = {
      processId,
      projectId: projectId || 'system',
      projectName,
      command: 'powershell.exe',
      args: ['-NoLogo'],
      status: 'starting',
      pid: null,
      detectedPort: null,
      startedAt: Date.now(),
      stoppedAt: null,
      exitCode: null,
      isInteractiveShell: true
    }

    const child = spawn('powershell.exe', ['-NoLogo'], {
      cwd,
      shell: false,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: 'xterm-256color'
      },
      windowsHide: true
    })

    managedProcess.pid = child.pid ?? null
    managedProcess.status = 'running'

    const record: ActiveProcessRecord = {
      process: managedProcess,
      childProcess: child,
      logBuffer: []
    }
    this.activeProcesses.set(processId, record)

    this.emitStateChange(managedProcess)
    this.appendLog(
      processId,
      'system',
      `[Nexus Terminal] Interactive PowerShell session started at ${cwd} (PID: ${child.pid})\r\n`
    )

    child.stdout?.on('data', (chunk: Buffer) => {
      this.appendLog(processId, 'stdout', chunk.toString('utf-8'))
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      this.appendLog(processId, 'stderr', chunk.toString('utf-8'))
    })

    child.on('close', (code) => {
      managedProcess.status = 'stopped'
      managedProcess.exitCode = code
      managedProcess.stoppedAt = Date.now()
      this.emitStateChange(managedProcess)
      this.appendLog(processId, 'system', `\r\n[Nexus Terminal] Shell closed (exit code: ${code})\r\n`)
    })

    return managedProcess
  }

  /**
   * Spawns a launch profile or custom command with venv & env injection.
   */
  async start(input: StartProcessInput): Promise<ManagedProcess> {
    const project = ProjectRepository.getById(input.projectId)
    if (!project) {
      throw new Error(`Project with ID "${input.projectId}" not found in database.`)
    }

    const processId = 'proc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)

    let command = ''
    let args: string[] = []
    let cwd = project.path
    let profileEnv: Record<string, string> = {}
    let profileName = 'Default'

    // 1. Resolve Launch Profile
    if (input.profileId) {
      const profiles = LaunchProfileRepository.getByProjectId(project.id)
      const targetProfile = profiles.find((p) => p.id === input.profileId)
      if (targetProfile) {
        command = targetProfile.command
        profileName = targetProfile.name
        try {
          args = JSON.parse(targetProfile.args_json || '[]')
        } catch {
          args = []
        }
        if (targetProfile.cwd && existsSync(targetProfile.cwd)) {
          cwd = targetProfile.cwd
        }
        try {
          profileEnv = JSON.parse(targetProfile.env_json || '{}')
        } catch {
          profileEnv = {}
        }
      }
    }

    // 2. Custom Command or Script Override
    if (!command) {
      if (input.customCommand) {
        command = input.customCommand
        args = input.customArgs || []
      } else {
        const scriptName = input.scriptName || 'dev'
        command = 'npm.cmd'
        args = ['run', scriptName]
      }
    }

    // 3. Environment Variable Merging (.env files + profileEnv + customEnv)
    const diskEnvVars = EnvResolver.getProjectEnv(project.path)
    const diskEnvMap: Record<string, string> = {}
    for (const v of diskEnvVars) {
      diskEnvMap[v.key] = v.value
    }

    const mergedEnv: Record<string, string> = {
      ...process.env as Record<string, string>,
      FORCE_COLOR: '1',
      TERM: 'xterm-256color',
      ...diskEnvMap,
      ...profileEnv,
      ...(input.customEnv || {})
    }

    // 4. Smart Python Venv Injection
    if (project.python_venv_path && existsSync(project.python_venv_path)) {
      const venvDir = dirname(project.python_venv_path) // e.g. D:\project\sequences\.venv\Scripts
      const venvRoot = dirname(venvDir) // e.g. D:\project\sequences\.venv

      // Inject venv\Scripts to front of PATH
      mergedEnv.PATH = `${venvDir};${mergedEnv.PATH || ''}`
      mergedEnv.VIRTUAL_ENV = venvRoot

      // If command is generic python, use the exact isolated interpreter
      const lowerCmd = command.toLowerCase()
      if (
        lowerCmd === 'python' ||
        lowerCmd === 'python.exe' ||
        lowerCmd === 'python3' ||
        lowerCmd === 'python3.exe'
      ) {
        command = project.python_venv_path
      }
    }

    const managedProcess: ManagedProcess = {
      processId,
      projectId: project.id,
      projectName: `${project.name} (${profileName})`,
      profileId: input.profileId,
      command,
      args,
      status: 'starting',
      pid: null,
      detectedPort: null,
      startedAt: Date.now(),
      stoppedAt: null,
      exitCode: null
    }

    const child = spawn(command, args, {
      cwd,
      shell: true,
      env: mergedEnv,
      windowsHide: true
    })

    managedProcess.pid = child.pid ?? null
    managedProcess.status = 'running'

    // Record process start in SQLite database
    const historyId = ProcessHistoryRepository.recordStart(project.id, input.profileId, child.pid)
    ProjectRepository.updateLastLaunched(project.id)

    const record: ActiveProcessRecord = {
      process: managedProcess,
      childProcess: child,
      logBuffer: [],
      historyId,
      profileId: input.profileId
    }
    this.activeProcesses.set(processId, record)

    this.emitStateChange(managedProcess)
    this.appendLog(
      processId,
      'system',
      `\x1b[36m[Nexus Engine]\x1b[0m Launched '${command} ${args.join(' ')}' in ${cwd} (PID: ${child.pid})\r\n`
    )

    // Output handler with regex URL and port interception
    const handleOutput = (text: string, level: 'stdout' | 'stderr') => {
      this.appendLog(processId, level, text)

      const detected = OutputParser.parseLine(text)
      if (detected && managedProcess.detectedPort !== detected.port) {
        managedProcess.detectedPort = detected.port
        this.emitStateChange(managedProcess)
        this.appendLog(
          processId,
          'system',
          `\x1b[32m[Nexus Port Detector]\x1b[0m Server ready: ${detected.url} (Port ${detected.port})\r\n`
        )

        // Emit IPC event process:server-ready to the renderer
        this.emitServerReady({
          projectId: managedProcess.projectId,
          profileId: input.profileId,
          processId,
          url: detected.url,
          port: detected.port
        })
      }
    }

    // Handle stdout
    child.stdout?.on('data', (data: Buffer) => {
      handleOutput(data.toString('utf-8'), 'stdout')
    })

    // Handle stderr
    child.stderr?.on('data', (data: Buffer) => {
      handleOutput(data.toString('utf-8'), 'stderr')
    })

    // Handle exit
    child.on('close', (code) => {
      managedProcess.status = code === 0 ? 'stopped' : 'crashed'
      managedProcess.exitCode = code
      managedProcess.stoppedAt = Date.now()
      this.emitStateChange(managedProcess)
      this.appendLog(
        processId,
        'system',
        `\r\n\x1b[33m[Nexus Engine]\x1b[0m Process exited with code ${code}\r\n`
      )

      if (record.historyId) {
        ProcessHistoryRepository.recordEnd(
          record.historyId,
          code,
          code !== 0 ? `Process exited with code ${code}` : undefined
        )
      }
    })

    child.on('error', (err) => {
      managedProcess.status = 'crashed'
      managedProcess.stoppedAt = Date.now()
      this.emitStateChange(managedProcess)
      this.appendLog(processId, 'stderr', `\x1b[31m[Spawn Error]\x1b[0m: ${err.message}\r\n`)

      if (record.historyId) {
        ProcessHistoryRepository.recordEnd(record.historyId, 1, err.message)
      }
    })

    return managedProcess
  }

  /**
   * Windows Process Tree Termination using taskkill /pid <PID> /T /F
   */
  stop(processId: string): Promise<boolean> {
    const record = this.activeProcesses.get(processId)
    if (!record || !record.childProcess.pid) {
      return Promise.resolve(false)
    }

    record.process.status = 'stopping'
    this.emitStateChange(record.process)

    const pid = record.childProcess.pid

    return new Promise((resolve) => {
      // Execute Windows taskkill to eradicate entire child tree
      exec(`taskkill /pid ${pid} /T /F`, (err, stdout, stderr) => {
        record.process.status = 'stopped'
        record.process.stoppedAt = Date.now()
        this.emitStateChange(record.process)
        this.activeProcesses.delete(processId)
        this.appendLog(
          processId,
          'system',
          `\x1b[31m[Nexus Engine]\x1b[0m Terminated process tree (PID: ${pid})\r\n`
        )
        resolve(true)
      })
    })
  }

  async restart(processId: string): Promise<ManagedProcess> {
    const record = this.activeProcesses.get(processId)
    if (!record) {
      throw new Error(`Process with ID "${processId}" not found.`)
    }

    const { projectId, profileId, command, args } = record.process
    await this.stop(processId)

    return this.start({
      projectId,
      profileId: profileId ?? undefined,
      customCommand: command,
      customArgs: args
    })
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(this.activeProcesses.keys())
    for (const id of ids) {
      try {
        await this.stop(id)
      } catch {
        // ignore
      }
    }
  }
}
