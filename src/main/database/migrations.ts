import type Database from 'better-sqlite3'

export interface Migration {
  version: number
  name: string
  up: (db: Database.Database) => void
  down?: (db: Database.Database) => void
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    up: (db) => {
      // 1. Projects table
      db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          description TEXT,
          brief TEXT,
          project_type TEXT NOT NULL,
          primary_language TEXT NOT NULL,
          framework TEXT,
          python_venv_path TEXT,
          tags_json TEXT DEFAULT '[]',
          is_favorite INTEGER NOT NULL DEFAULT 0,
          last_launched_at INTEGER,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
        CREATE INDEX IF NOT EXISTS idx_projects_favorite ON projects(is_favorite);
      `)

      // 2. Launch profiles table
      db.exec(`
        CREATE TABLE IF NOT EXISTS launch_profiles (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          command TEXT NOT NULL,
          args_json TEXT DEFAULT '[]',
          cwd TEXT,
          env_json TEXT DEFAULT '{}',
          env_file_path TEXT,
          auto_open_preview INTEGER NOT NULL DEFAULT 1,
          is_default INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_launch_profiles_project ON launch_profiles(project_id);
      `)

      // 3. Process history table
      db.exec(`
        CREATE TABLE IF NOT EXISTS process_history (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          profile_id TEXT,
          pid INTEGER,
          exit_code INTEGER,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          error_summary TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_process_history_project ON process_history(project_id);
      `)

      // 4. Settings table
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL
        );
      `)

      // Seed default settings if empty
      const defaultSettings = [
        ['theme', JSON.stringify('dark-game-launcher')],
        ['telemetry_interval_ms', JSON.stringify(3000)],
        ['sidebar_collapsed', JSON.stringify(false)],
        ['default_package_manager', JSON.stringify('npm')]
      ]

      const insertSetting = db.prepare(
        'INSERT OR IGNORE INTO settings (key, value_json) VALUES (?, ?)'
      )
      for (const [key, value] of defaultSettings) {
        insertSetting.run(key, value)
      }
    }
  },
  {
    version: 2,
    name: '002_patch_records',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS patch_records (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          relative_path TEXT NOT NULL,
          original_content TEXT NOT NULL,
          patched_content TEXT NOT NULL,
          unified_diff TEXT NOT NULL,
          explanation TEXT,
          file_hash_before TEXT NOT NULL,
          file_hash_after TEXT NOT NULL,
          applied_at INTEGER NOT NULL,
          rolled_back_at INTEGER,
          status TEXT NOT NULL DEFAULT 'applied',
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_patch_records_project ON patch_records(project_id);
      `)
    }
  }
]

export function runMigrations(db: Database.Database): { success: boolean; currentVersion: number } {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const row = db.prepare('SELECT MAX(version) as current_version FROM _migrations').get() as {
    current_version: number | null
  }
  const currentVersion = row?.current_version ?? 0

  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  )

  if (pendingMigrations.length === 0) {
    return { success: true, currentVersion }
  }

  const runAll = db.transaction(() => {
    let latestVersion = currentVersion
    for (const migration of pendingMigrations) {
      migration.up(db)
      db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name
      )
      latestVersion = migration.version
    }
    return latestVersion
  })

  const newVersion = runAll()
  return { success: true, currentVersion: newVersion }
}
