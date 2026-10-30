import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, statSync } from 'fs'
import { runMigrations } from './migrations'
import type {
  ProjectRecord,
  CreateProjectInput,
  LaunchProfileRecord,
  CreateLaunchProfileInput,
  DatabaseHealth,
  PatchRecord
} from '../../shared/ipc-types'

let dbInstance: Database.Database | null = null
let resolvedDbPath = ''

export function getDatabasePath(): string {
  if (resolvedDbPath) return resolvedDbPath
  try {
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    // strictly nexus.db as required by SPEC
    resolvedDbPath = join(userDataPath, 'nexus.db')
  } catch {
    resolvedDbPath = join(process.cwd(), 'nexus.db')
  }
  return resolvedDbPath
}

export function initDatabase(): Database.Database {
  if (dbInstance) return dbInstance

  const dbPath = getDatabasePath()
  dbInstance = new Database(dbPath)

  // SQLite non-negotiables & performance pragmas
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('synchronous = NORMAL')
  dbInstance.pragma('foreign_keys = ON')
  dbInstance.pragma('busy_timeout = 5000')

  // Execute versioned migrations
  runMigrations(dbInstance)

  return dbInstance
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase()
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close()
    } finally {
      dbInstance = null
    }
  }
}

// ==========================================
// Settings Repository
// ==========================================
export const SettingsRepository = {
  get<T = any>(key: string, defaultValue?: T): T {
    const db = getDatabase()
    const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get(key) as {
      value_json: string
    } | undefined
    if (!row) return defaultValue as T
    try {
      return JSON.parse(row.value_json)
    } catch {
      return defaultValue as T
    }
  },

  set(key: string, value: any): boolean {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO settings (key, value_json)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
    `)
    const res = stmt.run(key, JSON.stringify(value))
    return res.changes > 0
  },

  getAll(): Record<string, any> {
    const db = getDatabase()
    const rows = db.prepare('SELECT key, value_json FROM settings').all() as {
      key: string
      value_json: string
    }[]
    const result: Record<string, any> = {}
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value_json)
      } catch {
        result[r.key] = r.value_json
      }
    }
    return result
  }
}

// ==========================================
// Projects Repository
// ==========================================
export const ProjectRepository = {
  getAll(): ProjectRecord[] {
    const db = getDatabase()
    return db
      .prepare('SELECT * FROM projects ORDER BY is_favorite DESC, last_launched_at DESC, created_at DESC')
      .all() as ProjectRecord[]
  },

  getById(id: string): ProjectRecord | null {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRecord) || null
  },

  getByPath(path: string): ProjectRecord | null {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM projects WHERE path = ?').get(path) as ProjectRecord) || null
  },

  create(input: CreateProjectInput): ProjectRecord {
    const db = getDatabase()
    const id = 'proj_' + Buffer.from(input.path).toString('base64url').substring(0, 16)
    const now = Date.now()

    const stmt = db.prepare(`
      INSERT INTO projects (
        id, name, path, description, brief, project_type, primary_language,
        framework, python_venv_path, tags_json, is_favorite, last_launched_at, created_at
      ) VALUES (
        @id, @name, @path, @description, @brief, @project_type, @primary_language,
        @framework, @python_venv_path, @tags_json, @is_favorite, @last_launched_at, @created_at
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        brief = excluded.brief,
        project_type = excluded.project_type,
        primary_language = excluded.primary_language,
        framework = excluded.framework,
        python_venv_path = excluded.python_venv_path,
        tags_json = excluded.tags_json,
        is_favorite = excluded.is_favorite
    `)

    stmt.run({
      id,
      name: input.name,
      path: input.path,
      description: input.description ?? null,
      brief: input.brief ?? null,
      project_type: input.project_type,
      primary_language: input.primary_language,
      framework: input.framework ?? null,
      python_venv_path: input.python_venv_path ?? null,
      tags_json: JSON.stringify(input.tags || []),
      is_favorite: input.is_favorite ? 1 : 0,
      last_launched_at: null,
      created_at: now
    })

    return this.getById(id)!
  },

  update(id: string, input: Partial<CreateProjectInput>): ProjectRecord {
    const existing = this.getById(id)
    if (!existing) throw new Error(`Project ${id} not found`)

    const db = getDatabase()
    db.prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        brief = COALESCE(?, brief),
        project_type = COALESCE(?, project_type),
        primary_language = COALESCE(?, primary_language),
        framework = COALESCE(?, framework),
        python_venv_path = COALESCE(?, python_venv_path),
        tags_json = COALESCE(?, tags_json),
        is_favorite = COALESCE(?, is_favorite)
      WHERE id = ?
    `).run(
      input.name ?? null,
      input.description ?? null,
      input.brief ?? null,
      input.project_type ?? null,
      input.primary_language ?? null,
      input.framework ?? null,
      input.python_venv_path ?? null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.is_favorite !== undefined ? (input.is_favorite ? 1 : 0) : null,
      id
    )

    return this.getById(id)!
  },

  delete(id: string): boolean {
    const db = getDatabase()
    const res = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    return res.changes > 0
  },

  updateLastLaunched(id: string): void {
    const db = getDatabase()
    db.prepare('UPDATE projects SET last_launched_at = ? WHERE id = ?').run(Date.now(), id)
  }
}

// ==========================================
// Launch Profiles Repository
// ==========================================
export const LaunchProfileRepository = {
  getByProjectId(projectId: string): LaunchProfileRecord[] {
    const db = getDatabase()
    return db
      .prepare('SELECT * FROM launch_profiles WHERE project_id = ? ORDER BY is_default DESC, name ASC')
      .all(projectId) as LaunchProfileRecord[]
  },

  create(input: CreateLaunchProfileInput): LaunchProfileRecord {
    const db = getDatabase()
    const id = 'lp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)

    db.prepare(`
      INSERT INTO launch_profiles (
        id, project_id, name, command, args_json, cwd, env_json, env_file_path, auto_open_preview, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.project_id,
      input.name,
      input.command,
      JSON.stringify(input.args || []),
      input.cwd ?? null,
      JSON.stringify(input.env || {}),
      input.env_file_path ?? null,
      input.auto_open_preview ? 1 : 0,
      input.is_default ? 1 : 0
    )

    return db.prepare('SELECT * FROM launch_profiles WHERE id = ?').get(id) as LaunchProfileRecord
  },

  update(id: string, input: Partial<CreateLaunchProfileInput>): LaunchProfileRecord {
    const db = getDatabase()
    db.prepare(`
      UPDATE launch_profiles SET
        name = COALESCE(?, name),
        command = COALESCE(?, command),
        args_json = COALESCE(?, args_json),
        cwd = COALESCE(?, cwd),
        env_json = COALESCE(?, env_json),
        env_file_path = COALESCE(?, env_file_path),
        auto_open_preview = COALESCE(?, auto_open_preview),
        is_default = COALESCE(?, is_default)
      WHERE id = ?
    `).run(
      input.name ?? null,
      input.command ?? null,
      input.args ? JSON.stringify(input.args) : null,
      input.cwd ?? null,
      input.env ? JSON.stringify(input.env) : null,
      input.env_file_path ?? null,
      input.auto_open_preview !== undefined ? (input.auto_open_preview ? 1 : 0) : null,
      input.is_default !== undefined ? (input.is_default ? 1 : 0) : null,
      id
    )

    return db.prepare('SELECT * FROM launch_profiles WHERE id = ?').get(id) as LaunchProfileRecord
  },

  delete(id: string): boolean {
    const db = getDatabase()
    const res = db.prepare('DELETE FROM launch_profiles WHERE id = ?').run(id)
    return res.changes > 0
  }
}

// ==========================================
// Process History Repository
// ==========================================
export const ProcessHistoryRepository = {
  recordStart(projectId: string, profileId?: string, pid?: number): string {
    const db = getDatabase()
    const id = 'ph_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    db.prepare(`
      INSERT INTO process_history (id, project_id, profile_id, pid, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, profileId ?? null, pid ?? null, Date.now())
    return id
  },

  recordEnd(historyId: string, exitCode: number | null, errorSummary?: string): void {
    const db = getDatabase()
    db.prepare(`
      UPDATE process_history SET ended_at = ?, exit_code = ?, error_summary = ? WHERE id = ?
    `).run(Date.now(), exitCode, errorSummary ?? null, historyId)
  }
}

// ==========================================
// Patch Record Repository (SQLite Backup & Rollback Engine)
// ==========================================
export const PatchRecordRepository = {
  create(
    record: Omit<PatchRecord, 'id' | 'appliedAt' | 'status'> & { id?: string }
  ): PatchRecord {
    const db = getDatabase()
    const id = record.id || 'patch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    const appliedAt = Date.now()
    const stmt = db.prepare(`
      INSERT INTO patch_records (
        id, project_id, file_path, relative_path, original_content,
        patched_content, unified_diff, explanation, file_hash_before,
        file_hash_after, applied_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied')
    `)
    stmt.run(
      id,
      record.projectId,
      record.filePath,
      record.relativePath,
      record.originalContent,
      record.patchedContent,
      record.unifiedDiff,
      record.explanation || '',
      record.fileHashBefore,
      record.fileHashAfter,
      appliedAt
    )
    return {
      id,
      projectId: record.projectId,
      filePath: record.filePath,
      relativePath: record.relativePath,
      originalContent: record.originalContent,
      patchedContent: record.patchedContent,
      unifiedDiff: record.unifiedDiff,
      explanation: record.explanation,
      fileHashBefore: record.fileHashBefore,
      fileHashAfter: record.fileHashAfter,
      appliedAt,
      status: 'applied'
    }
  },

  getById(id: string): PatchRecord | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM patch_records WHERE id = ?').get(id) as any
    if (!row) return null
    return {
      id: row.id,
      projectId: row.project_id,
      filePath: row.file_path,
      relativePath: row.relative_path,
      originalContent: row.original_content,
      patchedContent: row.patched_content,
      unifiedDiff: row.unified_diff,
      explanation: row.explanation,
      fileHashBefore: row.file_hash_before,
      fileHashAfter: row.file_hash_after,
      appliedAt: row.applied_at,
      rolledBackAt: row.rolled_back_at,
      status: row.status
    }
  },

  getByProjectId(projectId: string): PatchRecord[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM patch_records WHERE project_id = ? ORDER BY applied_at DESC')
      .all(projectId) as any[]
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      filePath: row.file_path,
      relativePath: row.relative_path,
      originalContent: row.original_content,
      patchedContent: row.patched_content,
      unifiedDiff: row.unified_diff,
      explanation: row.explanation,
      fileHashBefore: row.file_hash_before,
      fileHashAfter: row.file_hash_after,
      appliedAt: row.applied_at,
      rolledBackAt: row.rolled_back_at,
      status: row.status
    }))
  },

  markRolledBack(id: string): boolean {
    const db = getDatabase()
    const res = db
      .prepare(
        "UPDATE patch_records SET status = 'rolled_back', rolled_back_at = ? WHERE id = ?"
      )
      .run(Date.now(), id)
    return res.changes > 0
  }
}

// ==========================================
// Database Health
// ==========================================
export function getDatabaseHealth(): DatabaseHealth {
  const db = getDatabase()
  const dbPath = getDatabasePath()

  const appliedMigrations = db
    .prepare('SELECT version, name, applied_at as appliedAt FROM _migrations ORDER BY version ASC')
    .all() as { version: number; name: string; appliedAt: string }[]

  const currentVersion = appliedMigrations.length > 0
    ? appliedMigrations[appliedMigrations.length - 1].version
    : 0

  const tablesRaw = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]

  const tables = tablesRaw.map((t) => {
    try {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get() as {
        count: number
      }
      return { name: t.name, rowCount: countRow?.count ?? 0 }
    } catch {
      return { name: t.name, rowCount: 0 }
    }
  })

  let fileSizeBytes = 0
  try {
    if (existsSync(dbPath)) {
      fileSizeBytes = statSync(dbPath).size
    }
  } catch {
    fileSizeBytes = 0
  }

  // Check WAL mode
  let walModeActive = false
  try {
    const pragmaRow = db.pragma('journal_mode') as any[]
    walModeActive = pragmaRow?.[0]?.journal_mode?.toLowerCase() === 'wal'
  } catch {
    walModeActive = false
  }

  return {
    dbPath,
    currentVersion,
    appliedMigrations,
    tables,
    walModeActive,
    fileSizeBytes
  }
}
