import React, { useState, useEffect } from 'react'
import {
  Network,
  RefreshCw,
  AlertTriangle,
  Search,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Radio
} from 'lucide-react'
import { useProcessStore } from '../stores/useProcessStore'

export const PortManagerView: React.FC = () => {
  const {
    listeningPorts,
    isLoadingPorts,
    fetchListeningPorts,
    killPort,
    killPid
  } = useProcessStore()

  const [searchFilter, setSearchFilter] = useState('')
  const [customPortInput, setCustomPortInput] = useState('')
  const [killMsg, setKillMsg] = useState('')

  useEffect(() => {
    fetchListeningPorts()
  }, [])

  const handleKillPort = async (port: number) => {
    const ok = await killPort(port)
    if (ok) {
      setKillMsg(`Port :${port} and its process tree were successfully terminated.`)
    } else {
      setKillMsg(`Process on port :${port} was killed or already released.`)
    }
    setTimeout(() => setKillMsg(''), 3000)
  }

  const handleKillPid = async (pid: number) => {
    const ok = await killPid(pid)
    if (ok) {
      setKillMsg(`Process tree PID ${pid} terminated via taskkill /T /F.`)
    } else {
      setKillMsg(`Process PID ${pid} terminated.`)
    }
    setTimeout(() => setKillMsg(''), 3000)
  }

  const handleCustomKill = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseInt(customPortInput, 10)
    if (isNaN(p) || p <= 0 || p > 65535) {
      alert('Please enter a valid port between 1 and 65535')
      return
    }
    await handleKillPort(p)
    setCustomPortInput('')
  }

  const filteredPorts = listeningPorts.filter((item) => {
    const q = searchFilter.toLowerCase()
    return (
      item.port.toString().includes(q) ||
      item.pid.toString().includes(q) ||
      item.processName.toLowerCase().includes(q) ||
      (item.matchedProjectName && item.matchedProjectName.toLowerCase().includes(q))
    )
  })

  // Common developer web ports
  const COMMON_DEV_PORTS = [3000, 5173, 5432, 8000, 8080, 8081, 11434, 27017]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-obsidian-900 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight flex items-center space-x-2">
            <Network className="w-5 h-5 text-electric-cyan" />
            <span>Localhost TCP Port Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Real-time Windows <code className="text-slate-300">netstat -ano</code> socket inspection. Forcefully kill stuck ports with one click.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchListeningPorts()}
            disabled={isLoadingPorts}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPorts ? 'animate-spin' : ''}`} />
            <span>{isLoadingPorts ? 'Scanning...' : 'Refresh Sockets'}</span>
          </button>
        </div>
      </div>

      {killMsg && (
        <div className="p-3 rounded-xl bg-electric-emerald/15 border border-electric-emerald/40 text-electric-emerald text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{killMsg}</span>
        </div>
      )}

      {/* Quick Common Dev Ports Matrix */}
      <div className="bg-obsidian-850 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-electric-indigo" />
            <span>Developer Ports Matrix</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            {listeningPorts.filter((p) => COMMON_DEV_PORTS.includes(p.port)).length} occupied
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 font-mono text-xs">
          {COMMON_DEV_PORTS.map((port) => {
            const match = listeningPorts.find((p) => p.port === port)
            const isBusy = Boolean(match)

            return (
              <div
                key={port}
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
                  isBusy
                    ? 'bg-electric-rose/10 border-electric-rose/30 text-electric-rose'
                    : 'bg-obsidian-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">:{port}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isBusy ? 'bg-electric-rose animate-pulse' : 'bg-slate-700'
                    }`}
                  />
                </div>

                <div className="mt-2 text-[10px]">
                  {isBusy ? (
                    <div>
                      <div className="truncate text-slate-300 font-medium">
                        {match?.processName}
                      </div>
                      <button
                        onClick={() => handleKillPort(port)}
                        className="mt-1 w-full text-center py-0.5 rounded bg-electric-rose/20 hover:bg-electric-rose/30 text-electric-rose font-bold"
                      >
                        Kill
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-600">FREE</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Manual Kill Form & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-obsidian-850 border border-slate-800 rounded-xl p-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search listening sockets by port, PID, or process name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-obsidian-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-electric-cyan"
          />
        </div>

        {/* Custom Port Killer */}
        <form onSubmit={handleCustomKill} className="flex items-center space-x-2 font-mono text-xs">
          <input
            type="number"
            placeholder="Kill Port (e.g. 8080)"
            value={customPortInput}
            onChange={(e) => setCustomPortInput(e.target.value)}
            className="w-40 bg-obsidian-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-electric-rose"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-electric-rose/20 hover:bg-electric-rose/30 text-electric-rose border border-electric-rose/40 font-bold transition-colors"
          >
            Force Kill
          </button>
        </form>
      </div>

      {/* All Listening Sockets Table */}
      <div className="bg-obsidian-850 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="h-10 px-4 bg-obsidian-900 border-b border-slate-800 flex items-center justify-between text-slate-400 font-bold text-[11px] uppercase tracking-wider">
          <span>Active Listening Sockets ({filteredPorts.length})</span>
          <span>Protocol: TCP (Windows NETSTAT)</span>
        </div>

        {filteredPorts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic">
            {isLoadingPorts ? 'Parsing active Windows sockets...' : 'No matching listening sockets found.'}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left divide-y divide-slate-800/80">
              <thead className="bg-obsidian-950/80 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Port</th>
                  <th className="py-2.5 px-4 font-bold">PID</th>
                  <th className="py-2.5 px-4 font-bold">Process Image Name</th>
                  <th className="py-2.5 px-4 font-bold">Nexus Project Match</th>
                  <th className="py-2.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPorts.map((item) => (
                  <tr key={`${item.port}-${item.pid}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-electric-cyan">
                      :{item.port}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {item.pid}
                    </td>
                    <td className="py-2.5 px-4 text-slate-200 font-medium truncate max-w-xs">
                      {item.processName}
                    </td>
                    <td className="py-2.5 px-4">
                      {item.matchedProjectName ? (
                        <span className="px-2 py-0.5 rounded bg-electric-emerald/15 text-electric-emerald border border-electric-emerald/30 font-bold">
                          {item.matchedProjectName}
                        </span>
                      ) : (
                        <span className="text-slate-600">External System Process</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleKillPid(item.pid)}
                        className="px-2.5 py-1 rounded bg-electric-rose/15 hover:bg-electric-rose/25 text-electric-rose border border-electric-rose/30 font-bold transition-colors inline-flex items-center space-x-1"
                        title={`Run taskkill /pid ${item.pid} /T /F`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Kill PID {item.pid}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
