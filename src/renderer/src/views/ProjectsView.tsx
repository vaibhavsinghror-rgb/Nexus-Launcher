import React, { useState } from 'react'
import {
  FolderKanban,
  Search,
  Plus,
  Grid,
  List,
  Filter,
  Star,
  Activity
} from 'lucide-react'
import { useLauncherStore } from '../stores/useLauncherStore'
import { useProcessStore } from '../stores/useProcessStore'
import { ProjectCard } from '../components/ProjectCard'

export const ProjectsView: React.FC = () => {
  const {
    projects,
    scanAndAddDirectory,
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
  const [filterText, setFilterText] = useState('')

  const filtered = projects.filter((p) => {
    const q = filterText.toLowerCase()
    const matchesQuery =
      p.name.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      p.primary_language.toLowerCase().includes(q) ||
      (p.framework && p.framework.toLowerCase().includes(q))

    if (!matchesQuery) return false
    if (onlyFavorites && p.is_favorite !== 1) return false

    const isRunning = runningProcesses.some((proc) => proc.projectId === p.id)
    if (onlyRunning && !isRunning) return false

    if (techStackFilter !== 'all') {
      const type = (p.project_type || '').toLowerCase()
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
    <div className="flex-1 overflow-y-auto p-6 space-y-5 select-none bg-obsidian-900 text-slate-100">
      {/* View Header & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-electric-indigo" />
            <span>All Registered Projects ({projects.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Launch profiles, architecture notes, and in-place runtime execution.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, path, framework..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-obsidian-850 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-electric-indigo w-64 font-mono"
            />
          </div>

          <button
            onClick={scanAndAddDirectory}
            disabled={isScanning}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-electric-indigo hover:bg-electric-indigoHover text-white font-mono text-xs font-bold transition-colors shadow-glow-indigo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isScanning ? 'Scanning...' : 'Add Directory'}</span>
          </button>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-obsidian-850 border border-slate-800 rounded-xl p-3">
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

      {/* Projects Grid / List */}
      {filtered.length === 0 ? (
        <div className="bg-obsidian-850 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
          <FolderKanban className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200 font-mono">No Matching Projects</h3>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {projects.length === 0
              ? 'Import a project directory to get started.'
              : 'No projects match your active search or filters.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => (
            <ProjectCard key={proj.id} project={proj} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((proj) => (
            <ProjectCard key={proj.id} project={proj} viewMode="list" />
          ))}
        </div>
      )}
    </div>
  )
}
