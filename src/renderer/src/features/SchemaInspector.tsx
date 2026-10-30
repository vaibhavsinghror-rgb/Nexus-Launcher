import React, { useEffect, useState } from 'react'
import { Database, ShieldCheck, Layers, RefreshCw, FileText } from 'lucide-react'
import type { DatabaseInfo } from '../../../shared/ipc-types'

export const SchemaInspector: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDbInfo = async () => {
    setLoading(true)
    try {
      const info = await window.nexus.database.getInfo()
      setDbInfo(info)
    } catch (err) {
      console.error('Failed to get DB info:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDbInfo()
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090d16]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Database className="w-5 h-5 text-amber-400" />
            <span>Database & Schema Inspector</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict better-sqlite3 engine running in Electron Main process with WAL mode & versioned migrations.
          </p>
        </div>

        <button
          onClick={fetchDbInfo}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {dbInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Database Path
            </span>
            <p className="text-xs font-mono text-slate-300 mt-1 truncate" title={dbInfo.dbPath}>
              {dbInfo.dbPath}
            </p>
          </div>

          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Current Schema Version
            </span>
            <p className="text-xl font-bold text-amber-400 mt-0.5">v{dbInfo.currentVersion}</p>
          </div>

          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              WAL Journal Mode
            </span>
            <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Active (Zero Lock Contention)</span>
            </p>
          </div>
        </div>
      )}

      {/* Applied Migrations Table */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Versioned SQL Migrations</span>
        </h3>

        {!dbInfo || dbInfo.appliedMigrations.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No migrations registered.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-500">
                  <th className="pb-2 font-semibold">Version</th>
                  <th className="pb-2 font-semibold">Migration Identifier</th>
                  <th className="pb-2 font-semibold">Applied At</th>
                  <th className="pb-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dbInfo.appliedMigrations.map((m) => (
                  <tr key={m.version} className="hover:bg-slate-800/30">
                    <td className="py-2.5 text-amber-400 font-bold">#{m.version}</td>
                    <td className="py-2.5 text-slate-200">{m.name}</td>
                    <td className="py-2.5 text-slate-400">{m.appliedAt}</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SUCCESS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Database Tables & Row Counts */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Active Tables & Record Statistics</span>
        </h3>

        {!dbInfo || dbInfo.tables.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No tables found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dbInfo.tables.map((tbl) => (
              <div
                key={tbl.name}
                className="p-3 rounded-lg bg-[#131d35]/60 border border-slate-800 flex items-center justify-between"
              >
                <span className="text-xs font-mono font-medium text-slate-200">{tbl.name}</span>
                <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-slate-800">
                  {tbl.rowCount} rows
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
