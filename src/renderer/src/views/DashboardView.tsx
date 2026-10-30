import React, { useState } from 'react'
import {
  Play,
  Square,
  FolderPlus,
  Star,
  Activity,
  Zap,
  HardDrive,
  Cpu,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Grid,
  List,
  Filter,
  Plus
} from 'lucide-react'
import { useLauncherStore } from '../stores/useLauncherStore'
import { useProcessStore } from '../stores/useProcessStore'
import { useTelemetryStore } from '../stores/useTelemetryStore'
import { ProjectCard } from '../components/ProjectCard'

export const DashboardView: React.FC = () => {
  const {
    projects,
    scanAndAddDirectory,
    importFromPath,
    isScanning,
    viewMode,
    setViewMode,
    techStackFilter,
    setTechStackFilter,
    onlyFavorites,
    setOnlyFavorites,
    onlyRunning,
    setOnlyRunning
  } = useLauncherStore()

  const { runningProcesses } = useProcessStore()
  const { telemetry } = useTelemetryStore()
  const [manualPathInput, setManualPathInput] = useState('')
  const [isImportingPath, setIsImportingPath] = useState(false)

  const handleManualPathImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualPathInput.trim()) return
    setIsImportingPath(true)
    try {
      const res = await importFromPath(manualPathInput)
      if (res) {
        setManualPathInput('')
      }
    } finally {
      setIsImportingPath(false)
    }
  }

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (onlyFavorites && p.is_favorite !== 1) return false
    const isRunning = runningProcesses.some((proc) => proc.projectId === p.id)
    if (onlyRunning && !isRunning) return false

    if (techStackFilter !== 'all') {
      const type = (p.project_type || '').toLowerCase()
      const framework = (p.framework || '').toLowerCase()
      const lang = (p.primary_language || '').toLowerCase()

      if (techStackFilter === 'node') {
        if (!['nodejs', 'nextjs', 'vite', 'react'].includes(type) && !lang.includes('script')) {
          return false
        }
      } else if (techStackFilter === 'python') {
        if (type !== 'python' && !lang.includes('python')) return false
      } else if (techStackFilter === 'rust') {
        if (type !== 'rust' && !lang.includes('rust')) return false
      } else if (techStackFilter === 'go') {
        if (type !== 'go' && !lang.includes('go')) return false
      }
    }
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-obsidian-900 text-slate-100">
      {/* Game-Launcher Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-obsidian-950 via-obsidian-850 to-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-electric-indigo/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-electric-emerald/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-electric-emerald uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-electric-emerald animate-ping" />
              <span>NEXUS DESKTOP LAUNCHER • SMART DETECTOR ACTIVE</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1.5 tracking-tight font-sans">
              Game-Grade Project Orchestrator
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Automatic framework detection, isolated Python venv resolution, and live hardware monitoring.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={scanAndAddDirectory}
              disabled={isScanning}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-electric-indigo to-indigo-600 hover:from-electric-indigoHover hover:to-indigo-500 text-white font-bold text-xs font-mono transition-all shadow-glow-indigo border border-indigo-400/30"
            >
              <FolderPlus className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Browse Folder'}</span>
            </button>
          </div>
        </div>

        {/* Path Quick-Add Bar */}
        <form onSubmit={handleManualPathImport} className="mt-4 pt-4 border-t border-slate-800/80 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Paste or drag a local Windows directory path (e.g. D:\project\sequences)..."
            value={manualPathInput}
            onChange={(e) => setManualPathInput(e.target.value)}
            className="flex-1 bg-obsidian-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-electric-indigo"
          />
          <button
            type="submit"
            disabled={isImportingPath || !manualPathInput.trim()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors disabled:opacity-40"
          >
            {isImportingPath ? 'Validating...' : 'Register Path'}
          </button>
        </form>

        {/* Quick Hero Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-obsidian-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
              <span>Tracked Projects</span>
              <FolderPlus className="w-3.5 h-3.5 text-electric-indigo" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">{projects.length}</div>
          </div>

          <div className="bg-obsidian-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
              <span>Active Processes</span>
              <Activity className="w-3.5 h-3.5 text-electric-emerald" />
            </div>
            <div className="text-xl font-bold font-mono text-electric-emerald mt-1">
              {runningProcesses.length}
            </div>
          </div>

          <div className="bg-obsidian-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
              <span>System RAM</span>
              <HardDrive className="w-3.5 h-3.5 text-electric-cyan" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {telemetry ? `${telemetry.ram.usagePercent}%` : '...'}
            </div>
          </div>

          <div className="bg-obsidian-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold">
              <span>NVIDIA GPU Load</span>
              <Zap className="w-3.5 h-3.5 text-electric-cyan" />
            </div>
            <div className="text-xl font-bold font-mono text-electric-cyan mt-1">
              {telemetry?.gpu.gpuUtilization !== null ? `${telemetry?.gpu.gpuUtilization}%` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Strip & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-obsidian-850 border border-slate-800 rounded-xl p-3">
        {/* Tech Stack Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-mono">
          <span className="text-slate-500 font-bold mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>

          {[
            { id: 'all', label: 'All Stacks' },
            { id: 'node', label: 'Node / Web' },
            { id: 'python', label: 'Python / ML' },
            { id: 'rust', label: 'Rust' },
            { id: 'go', label: 'Go' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTechStackFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                techStackFilter === tab.id
                  ? 'bg-electric-indigo text-white font-bold'
                  : 'bg-obsidian-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toggles & View Mode */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
              onlyFavorites
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-obsidian-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>

          <button
            onClick={() => setOnlyRunning(!onlyRunning)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
              onlyRunning
                ? 'bg-electric-emerald/20 text-electric-emerald border-electric-emerald/40 font-bold'
                : 'bg-obsidian-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Running</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Grid vs List toggle */}
          <div className="flex items-center bg-obsidian-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-800 text-slate-100' : 'text-slate-500'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-800 text-slate-100' : 'text-slate-500'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Project Cards Display */}
      {filteredProjects.length === 0 ? (
        <div className="bg-obsidian-850 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto my-8">
          <FolderPlus className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200 font-mono">No Matching Projects</h3>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {projects.length === 0
              ? 'Import a folder or paste a directory path above.'
              : 'Try clearing active filters to see all registered projects.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} viewMode="list" />
          ))}
        </div>
      )}
    </div>
  )
}
