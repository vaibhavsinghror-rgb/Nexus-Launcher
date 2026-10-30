import React, { useEffect, useState } from 'react'
import { Settings, Database, ShieldCheck, RefreshCw, Layers, HardDrive, Check } from 'lucide-react'
import { useTelemetryStore } from '../stores/useTelemetryStore'

export const SettingsView: React.FC = () => {
  const { dbHealth, fetchOnce } = useTelemetryStore()
  const [telemetryInterval, setTelemetryInterval] = useState(3000)
  const [packageManager, setPackageManager] = useState('npm')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      const interval = await window.nexus.settings.get('telemetry_interval_ms', 3000)
      const pm = await window.nexus.settings.get('default_package_manager', 'npm')
      setTelemetryInterval(interval)
      setPackageManager(pm)
    }
    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    await window.nexus.settings.set('telemetry_interval_ms', telemetryInterval)
    await window.nexus.settings.set('default_package_manager', packageManager)
    setSaveMessage('Settings saved to nexus.db')
    setTimeout(() => setSaveMessage(''), 2500)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-obsidian-900 text-slate-100">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight flex items-center space-x-2">
            <Settings className="w-5 h-5 text-electric-indigo" />
            <span>Launcher &amp; SQLite Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Configure SQLite persistence, hardware telemetry frequencies, and package manager preferences.
          </p>
        </div>

        <button
          onClick={() => fetchOnce()}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh DB Stats</span>
        </button>
      </div>

      {/* SQLite Database Engine Inspection */}
      <div className="bg-obsidian-850 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center space-x-2">
          <Database className="w-4 h-4 text-electric-indigo" />
          <span>better-sqlite3 Engine &amp; Storage Architecture</span>
        </h3>

        {dbHealth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-obsidian-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Database File</span>
              <span className="text-slate-200 mt-0.5 font-bold truncate block" title={dbHealth.dbPath}>
                {dbHealth.dbPath}
              </span>
              <span className="text-slate-500 text-[10px] mt-1 block">
                {(dbHealth.fileSizeBytes / 1024).toFixed(1)} KB on disk
              </span>
            </div>

            <div className="p-3 rounded-lg bg-obsidian-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Journal Mode</span>
              <span className="text-electric-emerald mt-0.5 font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>WAL (Write-Ahead Logging)</span>
              </span>
              <span className="text-slate-500 text-[10px] mt-1 block">
                Zero file locking contention
              </span>
            </div>

            <div className="p-3 rounded-lg bg-obsidian-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Migration Schema</span>
              <span className="text-electric-indigo mt-0.5 font-bold block">
                Version {dbHealth.currentVersion} (001_initial_schema)
              </span>
              <span className="text-slate-500 text-[10px] mt-1 block">
                Auto-versioned SQL migrations
              </span>
            </div>
          </div>
        )}

        {/* Database Tables Registered */}
        {dbHealth && (
          <div className="pt-2">
            <span className="text-[11px] font-mono text-slate-400 font-bold block mb-2">
              Registered Tables &amp; Active Rows:
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {dbHealth.tables.map((tbl) => (
                <div
                  key={tbl.name}
                  className="px-3 py-2 rounded-lg bg-obsidian-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-slate-300 font-medium">{tbl.name}</span>
                  <span className="font-bold text-electric-cyan px-2 py-0.5 rounded bg-slate-800">
                    {tbl.rowCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* General Preferences */}
      <div className="bg-obsidian-850 border border-slate-800 rounded-xl p-5 space-y-4 max-w-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
          Launcher Preferences
        </h3>

        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 mb-1">Hardware Telemetry Polling Rate</label>
            <select
              value={telemetryInterval}
              onChange={(e) => setTelemetryInterval(parseInt(e.target.value, 10))}
              className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value={1000}>1 Second (Realtime)</option>
              <option value={3000}>3 Seconds (Default - Spec)</option>
              <option value={5000}>5 Seconds (Low Overhead)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Default Node Package Manager</label>
            <select
              value={packageManager}
              onChange={(e) => setPackageManager(e.target.value)}
              className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value="npm">npm</option>
              <option value="pnpm">pnpm</option>
              <option value="yarn">yarn</option>
              <option value="bun">bun</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saveMessage ? (
            <span className="text-xs font-mono text-electric-emerald flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>{saveMessage}</span>
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 rounded-lg bg-electric-indigo hover:bg-electric-indigoHover text-white font-mono text-xs font-bold transition-colors shadow-glow-indigo"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
