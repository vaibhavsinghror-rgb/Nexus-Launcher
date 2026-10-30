import { z } from 'zod'

// ==========================================
// IPC Channel Names
// ==========================================
export const IPC_CHANNELS = {
  // Telemetry
  GET_TELEMETRY: 'nexus:get-telemetry',

  // Settings
  GET_SETTING: 'nexus:get-setting',
  SET_SETTING: 'nexus:set-setting',
  GET_ALL_SETTINGS: 'nexus:get-all-settings',

  // Database
  GET_DB_HEALTH: 'nexus:get-db-health',

  // System
  OPEN_PATH: 'nexus:open-path',
  OPEN_IN_VSCODE: 'nexus:open-in-vscode',
  SELECT_DIRECTORY: 'nexus:select-directory',

  // Projects
  GET_PROJECTS: 'nexus:get-projects',
  GET_PROJECT_BY_ID: 'nexus:get-project-by-id',
  CREATE_PROJECT: 'nexus:create-project',
  UPDATE_PROJECT: 'nexus:update-project',
  DELETE_PROJECT: 'nexus:delete-project',
  INSPECT_PATH: 'nexus:inspect-path',
  SCAN_DIRECTORY: 'nexus:scan-directory',

  // Launch Profiles
  GET_LAUNCH_PROFILES: 'nexus:get-launch-profiles',
  CREATE_LAUNCH_PROFILE: 'nexus:create-launch-profile',
  UPDATE_LAUNCH_PROFILE: 'nexus:update-launch-profile',
  DELETE_LAUNCH_PROFILE: 'nexus:delete-launch-profile',
  LAUNCH_COMPOUND: 'nexus:launch-compound',

  // Process Execution & Terminal
  START_PROCESS: 'nexus:start-process',
  STOP_PROCESS: 'nexus:stop-process',
  RESTART_PROCESS: 'nexus:restart-process',
  GET_RUNNING_PROCESSES: 'nexus:get-running-processes',
  CHECK_PORT: 'nexus:check-port',
  GET_ALL_LISTENING_PORTS: 'nexus:get-all-listening-ports',
  KILL_PORT: 'nexus:kill-port',
  KILL_PID: 'nexus:kill-pid',
  TERMINAL_INPUT: 'nexus:terminal-input',
  SPAWN_SHELL: 'nexus:spawn-shell',
  LOG_STREAM: 'nexus:log-stream',
  PROCESS_STATE_CHANGE: 'nexus:process-state-change',

  // File Tree & Schema / Config Inspector
  GET_DIRECTORY_TREE: 'nexus:get-directory-tree',
  GET_PROJECT_CONFIG_FILES: 'nexus:get-project-config-files',
  READ_FILE_CONTENT: 'nexus:read-file-content',

  // Git & Environment
  GET_GIT_STATUS: 'nexus:get-git-status',
  GET_ENV_VARS: 'nexus:get-env-vars',
  SAVE_ENV_FILE: 'nexus:save-env-file',

  // Live Preview & Server Ready
  OPEN_EXTERNAL_URL: 'nexus:open-external-url',
  SERVER_READY: 'process:server-ready',
  PING_ENDPOINT: 'nexus:ping-endpoint',

  // Local-First AI Architecture & Crash Diagnostics
  AI_TEST_CONNECTION: 'nexus:ai-test-connection',
  AI_LIST_MODELS: 'nexus:ai-list-models',
  AI_GET_CONFIG: 'nexus:ai-get-config',
  AI_SAVE_CONFIG: 'nexus:ai-save-config',
  AI_DIAGNOSE_CRASH: 'nexus:ai-diagnose-crash',
  AI_CANCEL_REQUEST: 'nexus:ai-cancel-request',

  // Patch Engine & Human-in-the-Loop Code Repair
  PATCH_PREPARE: 'nexus:patch-prepare',
  PATCH_APPLY: 'nexus:patch-apply',
  PATCH_ROLLBACK: 'nexus:patch-rollback',
  PATCH_GET_HISTORY: 'nexus:patch-get-history'
} as const

// ==========================================
// Hardware Telemetry Types & Schemas
// ==========================================
export const GpuTelemetrySchema = z.object({
  hasNvidiaGpu: z.boolean(),
  gpuName: z.string().nullable(),
  gpuUtilization: z.number().nullable(), // %
  vramUsedMb: z.number().nullable(),
  vramTotalMb: z.number().nullable(),
  vramPercent: z.number().nullable()
})
export type GpuTelemetry = z.infer<typeof GpuTelemetrySchema>

export const SystemTelemetrySchema = z.object({
  timestamp: z.number(),
  cpu: z.object({
    usagePercent: z.number(),
    cores: z.number(),
    model: z.string()
  }),
  ram: z.object({
    usedBytes: z.number(),
    totalBytes: z.number(),
    freeBytes: z.number(),
    usagePercent: z.number(),
    usedGb: z.number(),
    totalGb: z.number()
  }),
  gpu: GpuTelemetrySchema,
  os: z.object({
    platform: z.string(),
    release: z.string(),
    uptimeSeconds: z.number(),
    arch: z.string()
  })
})
export type SystemTelemetry = z.infer<typeof SystemTelemetrySchema>

// ==========================================
// Database Models & Schemas
// ==========================================
export const ProjectTypeSchema = z.enum([
  'nodejs',
  'nextjs',
  'vite',
  'react',
  'python',
  'rust',
  'go',
  'docker',
  'other'
])
export type ProjectType = z.infer<typeof ProjectTypeSchema>

export const ProjectRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  description: z.string().nullable().optional(),
  brief: z.string().nullable().optional(),
  project_type: ProjectTypeSchema,
  primary_language: z.string(),
  framework: z.string().nullable().optional(),
  python_venv_path: z.string().nullable().optional(),
  tags_json: z.string(),
  is_favorite: z.number(),
  last_launched_at: z.number().nullable().optional(),
  created_at: z.number()
})
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  path: z.string().min(1, 'Project path is required'),
  description: z.string().optional(),
  brief: z.string().optional(),
  project_type: ProjectTypeSchema.default('nodejs'),
  primary_language: z.string().default('TypeScript'),
  framework: z.string().optional(),
  python_venv_path: z.string().optional(),
  tags: z.array(z.string()).default([]),
  is_favorite: z.boolean().default(false)
})
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>

export const LaunchProfileRecordSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  name: z.string(),
  command: z.string(),
  args_json: z.string(),
  cwd: z.string().nullable().optional(),
  env_json: z.string(),
  env_file_path: z.string().nullable().optional(),
  auto_open_preview: z.number(),
  is_default: z.number()
})
export type LaunchProfileRecord = z.infer<typeof LaunchProfileRecordSchema>

export const CreateLaunchProfileInputSchema = z.object({
  project_id: z.string(),
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
  env: z.record(z.string()).default({}),
  env_file_path: z.string().optional(),
  auto_open_preview: z.boolean().default(true),
  is_default: z.boolean().default(false)
})
export type CreateLaunchProfileInput = z.infer<typeof CreateLaunchProfileInputSchema>

export const DatabaseHealthSchema = z.object({
  dbPath: z.string(),
  currentVersion: z.number(),
  appliedMigrations: z.array(
    z.object({
      version: z.number(),
      name: z.string(),
      appliedAt: z.string()
    })
  ),
  tables: z.array(
    z.object({
      name: z.string(),
      rowCount: z.number()
    })
  ),
  walModeActive: z.boolean(),
  fileSizeBytes: z.number()
})
export type DatabaseHealth = z.infer<typeof DatabaseHealthSchema>

// ==========================================
// Git & Environment Models
// ==========================================
export const GitStatusSchema = z.object({
  isGitRepo: z.boolean(),
  branch: z.string().nullable(),
  isClean: z.boolean(),
  dirtyCount: z.number(),
  ahead: z.number(),
  behind: z.number(),
  lastCommitMessage: z.string().nullable(),
  lastCommitAuthor: z.string().nullable(),
  lastCommitDate: z.string().nullable()
})
export type GitStatus = z.infer<typeof GitStatusSchema>

export const EnvVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
  isSecret: z.boolean(),
  sourceFile: z.string()
})
export type EnvVariable = z.infer<typeof EnvVariableSchema>

// ==========================================
// Smart Scanned Project & File Tree
// ==========================================
export interface ScannedProject {
  name: string
  path: string
  type: ProjectType
  framework?: string
  primaryLanguage: string
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'cargo' | 'none'
  pythonVenvPath?: string | null
  scripts: Record<string, string>
  suggestedPort?: number
  gitBranch?: string | null
  isGitClean?: boolean
  dirtyFilesCount?: number
  suggestedProfiles?: Array<{
    name: string
    command: string
    args: string[]
    isDefault?: boolean
    autoOpenPreview?: boolean
  }>
}

export interface FileTreeNode {
  name: string
  path: string
  relativePath: string
  isDirectory: boolean
  size?: number
  extension?: string
  children?: FileTreeNode[]
}

export interface ProjectConfigFile {
  name: string
  path: string
  category: 'schema' | 'config' | 'docker' | 'docs' | 'env'
  language: string
  sizeBytes: number
}

// ==========================================
// Process Runtime & Port Types
// ==========================================
export const ProcessStatusSchema = z.enum([
  'idle',
  'starting',
  'running',
  'stopping',
  'crashed',
  'stopped'
])
export type ProcessStatus = z.infer<typeof ProcessStatusSchema>

export const LogLevelSchema = z.enum(['stdout', 'stderr', 'system'])
export type LogLevel = z.infer<typeof LogLevelSchema>

export const LogEntrySchema = z.object({
  id: z.string(),
  processId: z.string(),
  timestamp: z.number(),
  level: LogLevelSchema,
  message: z.string()
})
export type LogEntry = z.infer<typeof LogEntrySchema>

export const ManagedProcessSchema = z.object({
  processId: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  profileId: z.string().nullable().optional(),
  command: z.string(),
  args: z.array(z.string()),
  status: ProcessStatusSchema,
  pid: z.number().nullable(),
  detectedPort: z.number().nullable(),
  startedAt: z.number(),
  stoppedAt: z.number().nullable(),
  exitCode: z.number().nullable(),
  isInteractiveShell: z.boolean().optional()
})
export type ManagedProcess = z.infer<typeof ManagedProcessSchema>

export const StartProcessInputSchema = z.object({
  projectId: z.string(),
  profileId: z.string().optional(),
  scriptName: z.string().optional(),
  customCommand: z.string().optional(),
  customArgs: z.array(z.string()).optional(),
  customEnv: z.record(z.string()).optional(),
  isInteractiveShell: z.boolean().optional()
})
export type StartProcessInput = z.infer<typeof StartProcessInputSchema>

export interface ListeningPortInfo {
  port: number
  pid: number
  processName: string
  protocol: string
  matchedProjectName?: string
  matchedProjectId?: string
}

export interface ServerReadyEvent {
  projectId: string
  profileId?: string
  processId: string
  url: string
  port: number
}

export const PingEndpointInputSchema = z.object({
  url: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  timeoutMs: z.number().default(10000)
})
export type PingEndpointInput = z.infer<typeof PingEndpointInputSchema>

export interface PingEndpointResult {
  status: number
  statusText: string
  latencyMs: number
  headers: Record<string, string>
  data: string
  isJson: boolean
  error?: string
}

// ==========================================
// Local-First AI Architecture & Diagnostics
// ==========================================
export const AIProviderTypeSchema = z.enum(['ollama', 'lmstudio', 'openai-compatible'])
export type AIProviderType = z.infer<typeof AIProviderTypeSchema>

export const AIProviderConfigSchema = z.object({
  provider: AIProviderTypeSchema.default('ollama'),
  baseUrl: z.string().min(1).default('http://127.0.0.1:11434'),
  model: z.string().min(1).default('llama3:latest'),
  temperature: z.number().min(0).max(1).default(0.2),
  contextTokenLimit: z.number().min(512).max(131072).default(8192),
  apiKey: z.string().optional()
})
export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>

export interface AIModelInfo {
  id: string
  name: string
  sizeBytes?: number
  modifiedAt?: string
}

export interface AIConnectionTestResult {
  success: boolean
  latencyMs: number
  models: AIModelInfo[]
  message: string
  error?: string
}

export const CrashDiagnosticRequestSchema = z.object({
  projectId: z.string().min(1),
  processId: z.string().optional(),
  exitCode: z.number().default(1),
  errorSummary: z.string().optional(),
  recentLogs: z.string().optional(),
  customNotes: z.string().optional()
})
export type CrashDiagnosticRequest = z.infer<typeof CrashDiagnosticRequestSchema>

export interface CrashDiagnosticReport {
  observedEvidence: string
  exitCode: number
  rootCauseCategory:
    | 'Missing Dependency'
    | 'Port Conflict'
    | 'Venv Mismatch'
    | 'Syntax/Import Error'
    | 'Missing Env Var'
    | 'Runtime Error'
    | 'Other'
  fileReference?: {
    file: string
    line?: number
    column?: number
  }
  explanation: string
  recommendedFix: string
  recommendedCommand?: string
  suggestedPatch?: {
    filePath: string
    diff: string
  }
  timestamp: number
  modelUsed: string
  latencyMs: number
}

// ==========================================
// Patch Engine & Human-in-the-Loop Code Repair
// ==========================================
export interface PatchRecord {
  id: string
  projectId: string
  filePath: string
  relativePath: string
  originalContent: string
  patchedContent: string
  unifiedDiff: string
  explanation?: string
  fileHashBefore: string
  fileHashAfter: string
  appliedAt: number
  rolledBackAt?: number | null
  status: 'applied' | 'rolled_back'
}

export const PreparePatchInputSchema = z.object({
  projectId: z.string().min(1),
  filePath: z.string().min(1),
  proposedCode: z.string(),
  explanation: z.string().default('AI proposed repair')
})
export type PreparePatchInput = z.infer<typeof PreparePatchInputSchema>

export interface PatchPreviewResult {
  valid: boolean
  filePath: string
  relativePath: string
  originalContent: string
  patchedContent: string
  unifiedDiff: string
  fileHashBefore: string
  explanation: string
  error?: string
}

export const ApplyPatchInputSchema = z.object({
  projectId: z.string().min(1),
  filePath: z.string().min(1),
  patchedContent: z.string(),
  expectedHash: z.string().min(1),
  explanation: z.string().default(''),
  unifiedDiff: z.string().default('')
})
export type ApplyPatchInput = z.infer<typeof ApplyPatchInputSchema>

export interface ApplyPatchResult {
  success: boolean
  patchRecordId?: string
  filePath: string
  message: string
  error?: string
}

export interface RollbackPatchResult {
  success: boolean
  filePath: string
  message: string
  error?: string
}

// ==========================================
// Window.nexus Strict Bridge API
// ==========================================
export interface NexusBridge {
  telemetry: {
    get: () => Promise<SystemTelemetry>
  }
  settings: {
    get: <T = any>(key: string, defaultValue?: T) => Promise<T>
    set: (key: string, value: any) => Promise<boolean>
    getAll: () => Promise<Record<string, any>>
  }
  database: {
    getHealth: () => Promise<DatabaseHealth>
  }
  system: {
    openPath: (path: string) => Promise<boolean>
    openInVsCode: (path: string) => Promise<boolean>
    openExternalUrl: (url: string) => Promise<boolean>
    selectDirectory: () => Promise<string | null>
  }
  projects: {
    getAll: () => Promise<ProjectRecord[]>
    getById: (id: string) => Promise<ProjectRecord | null>
    create: (data: CreateProjectInput) => Promise<ProjectRecord>
    update: (id: string, data: Partial<CreateProjectInput>) => Promise<ProjectRecord>
    delete: (id: string) => Promise<boolean>
    inspectPath: (path: string) => Promise<ScannedProject | null>
    scanDirectory: (path: string) => Promise<ScannedProject[]>
  }
  launchProfiles: {
    getByProjectId: (projectId: string) => Promise<LaunchProfileRecord[]>
    create: (data: CreateLaunchProfileInput) => Promise<LaunchProfileRecord>
    update: (id: string, data: Partial<CreateLaunchProfileInput>) => Promise<LaunchProfileRecord>
    delete: (id: string) => Promise<boolean>
    launchCompound: (profileIds: string[]) => Promise<ManagedProcess[]>
  }
  process: {
    start: (input: StartProcessInput) => Promise<ManagedProcess>
    stop: (processId: string) => Promise<boolean>
    restart: (processId: string) => Promise<ManagedProcess>
    getRunning: () => Promise<ManagedProcess[]>
    checkPort: (port: number) => Promise<{ inUse: boolean; pid?: number; processName?: string }>
    getAllListeningPorts: () => Promise<ListeningPortInfo[]>
    killPort: (port: number) => Promise<boolean>
    killPid: (pid: number) => Promise<boolean>
    sendInput: (processId: string, data: string) => Promise<boolean>
    spawnShell: (projectId?: string) => Promise<ManagedProcess>
    pingEndpoint: (input: PingEndpointInput) => Promise<PingEndpointResult>
    onLog: (callback: (log: LogEntry) => void) => () => void
    onStateChange: (callback: (process: ManagedProcess) => void) => () => void
    onServerReady: (callback: (event: ServerReadyEvent) => void) => () => void
  }
  ai: {
    testConnection: (config: AIProviderConfig) => Promise<AIConnectionTestResult>
    listModels: (config: AIProviderConfig) => Promise<AIModelInfo[]>
    getConfig: () => Promise<AIProviderConfig>
    saveConfig: (config: AIProviderConfig) => Promise<boolean>
    diagnoseCrash: (request: CrashDiagnosticRequest) => Promise<CrashDiagnosticReport>
    cancelRequest: () => Promise<boolean>
  }
  config: {
    getFiles: (projectPath: string) => Promise<ProjectConfigFile[]>
    readFile: (filePath: string) => Promise<string>
  }
  files: {
    getTree: (projectPath: string, maxDepth?: number) => Promise<FileTreeNode | null>
  }
  git: {
    getStatus: (projectPath: string) => Promise<GitStatus>
  }
  env: {
    getVars: (projectPath: string) => Promise<EnvVariable[]>
    saveVars: (projectPath: string, fileName: string, vars: Record<string, string>) => Promise<boolean>
  },
  patches: {
    prepare: (plan: PreparePatchInput) => Promise<PatchPreviewResult>
    apply: (patch: ApplyPatchInput) => Promise<ApplyPatchResult>
    rollback: (patchRecordId: string) => Promise<RollbackPatchResult>
    getHistory: (projectId: string) => Promise<PatchRecord[]>
  }
}

declare global {
  interface Window {
    nexus: NexusBridge
  }
}
