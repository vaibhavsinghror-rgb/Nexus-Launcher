import React, { useRef, useEffect } from 'react'
import {
  Activity,
  Square,
  RotateCw,
  Terminal,
  Trash2,
  Copy,
  Globe,
  ExternalLink,
  Search
} from 'lucide-react'
import { useProcessStore } from '../stores/useProcessStore'

export const ProcessesView: React.FC = () => {
  const {
    runningProcesses,
    activeProcessId,
    setActiveProcessId,
    logsByProcessId,
    logFilter,
    setLogFilter,
    autoScroll,
    setAutoScroll,
    stopProcess,
    restartProcess,
    clearLogs
  } = useProcessStore()

  const logContainerRef = useRef<HTMLDivElement>(null)

  const activeProc =
    runningProcesses.find((p) => p.processId === activeProcessId) || runningProcesses[0]
  const currentLogs = activeProc ? logsByProcessId[activeProc.processId] || [] : []

  const filteredLogs = currentLogs.filter((log) => {
    if (logFilter === 'all') return true
    return log.level === logFilter
  })

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [filteredLogs, autoScroll])

  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.level}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4 select-none bg-obsidian-900 text-slate-100">
      {/* View Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight flex items-center space-x-2">
            <Activity className="w-5 h-5 text-electric-emerald" />
            <span>Active Running Processes ({runningProcesses.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Real-time child process monitoring, log streams, and Windows tree-kill execution.
          </p>
        </div>
      </div>

      {runningProcesses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-obsidian-850">
          <Terminal className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-200">No Active Processes</h3>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Launch a project from the Dashboard or All Projects view to stream logs.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col border border-slate-800 rounded-xl bg-obsidian-950">
          {/* Process Tabs & Action Controls */}
          <div className="h-11 px-3 bg-obsidian-850 border-b border-slate-800 flex items-center justify-between shrink-0">
            {/* Process Selection Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[50%]">
              {runningProcesses.map((p) => {
                const isSelected = (activeProc?.processId === p.processId)
                return (
                  <button
                    key={p.processId}
                    onClick={() => setActiveProcessId(p.processId)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-electric-indigo/20 text-electric-indigoGlow border border-electric-indigo/40 font-bold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-electric-emerald animate-pulse" />
                    <span className="truncate max-w-[140px]">{p.projectName}</span>
                    {p.detectedPort && (
                      <span className="text-[10px] text-electric-cyan">:{p.detectedPort}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right Action Controls */}
            {activeProc && (
              <div className="flex items-center space-x-2 text-xs font-mono">
                {activeProc.detectedPort && (
                  <button
                    onClick={() =>
                      window.nexus.system.openPath(`http://localhost:${activeProc.detectedPort}`)
                    }
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-electric-cyan/15 text-electric-cyan border border-electric-cyan/30 hover:bg-electric-cyan/25 transition-colors font-bold"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Open :{activeProc.detectedPort}</span>
                  </button>
                )}

                <button
                  onClick={() => restartProcess(activeProc.processId)}
                  title="Restart Process"
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>

                <button
                  onClick={() => stopProcess(activeProc.processId)}
                  title="Stop Process"
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-electric-rose/15 hover:bg-electric-rose/25 text-electric-rose border border-electric-rose/30 transition-colors font-bold"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>

                <div className="h-4 w-px bg-slate-800" />

                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value as any)}
                  className="bg-obsidian-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Logs</option>
                  <option value="stdout">stdout</option>
                  <option value="stderr">stderr</option>
                  <option value="system">system</option>
                </select>

                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2 py-1 rounded text-[10px] font-mono ${
                    autoScroll ? 'bg-electric-indigo/20 text-electric-indigo' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={() => clearLogs(activeProc.processId)}
                  title="Clear Console"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleCopyLogs}
                  title="Copy Console Logs"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Active Process Meta Strip */}
          {activeProc && (
            <div className="px-4 py-2 bg-obsidian-900 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
              <div className="flex items-center space-x-4">
                <span>
                  PID: <strong className="text-slate-200">{activeProc.pid || 'N/A'}</strong>
                </span>
                <span>•</span>
                <span>
                  Command:{' '}
                  <strong className="text-slate-200">
                    {activeProc.command} {activeProc.args.join(' ')}
                  </strong>
                </span>
              </div>
              <div>
                Started:{' '}
                <span className="text-slate-300">
                  {new Date(activeProc.startedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {/* Log Stream Output */}
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 bg-obsidian-950 select-text"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 italic select-none">
                Waiting for console stdout / stderr stream...
              </div>
            ) : (
              filteredLogs.map((log) => {
                let textColor = 'text-slate-300'
                if (log.level === 'stderr') textColor = 'text-electric-rose font-medium'
                if (log.level === 'system') textColor = 'text-electric-cyan font-semibold'

                return (
                  <div key={log.id} className="flex items-start space-x-2.5">
                    <span className="text-slate-600 text-[10px] shrink-0 select-none">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`break-all whitespace-pre-wrap ${textColor}`}>
                      {log.message}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
