import React from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  Network,
  Cpu,
  Settings,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Star,
  Terminal,
  Zap
} from 'lucide-react'
import { useLauncherStore, NavView } from '../stores/useLauncherStore'
import { useProcessStore } from '../stores/useProcessStore'

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    sidebarCollapsed,
    toggleSidebar,
    projects,
    setSelectedProjectId,
    scanAndAddDirectory,
    isScanning
  } = useLauncherStore()

  const { runningProcesses, isTerminalOpen, setIsTerminalOpen } = useProcessStore()

  const navItems: Array<{ id: NavView; label: string; icon: React.ElementType; badge?: number | string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'All Projects', icon: FolderKanban, badge: projects.length || undefined },
    {
      id: 'processes',
      label: 'Running Processes',
      icon: Activity,
      badge: runningProcesses.length > 0 ? runningProcesses.length : undefined
    },
    { id: 'ports', label: 'Port Manager', icon: Network },
    { id: 'ai', label: 'AI Assistant', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const favorites = projects.filter((p) => p.is_favorite === 1)

  return (
    <aside
      className={`bg-obsidian-900 border-r border-slate-800 flex flex-col h-full select-none transition-all duration-300 relative z-20 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-slate-800 bg-obsidian-950/60">
        {!sidebarCollapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-electric-indigo to-electric-emerald flex items-center justify-center shadow-glow-indigo shrink-0">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm text-slate-100 tracking-wider font-mono">
                  NEXUS
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-electric-indigo/20 text-electric-indigo border border-electric-indigo/40">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-tight truncate">
                Game-Launcher Engine
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-electric-indigo to-electric-emerald flex items-center justify-center shadow-glow-indigo">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ${
            sidebarCollapsed ? 'hidden' : 'block'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg text-xs font-medium transition-all ${
                sidebarCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-electric-indigo/15 text-electric-indigoGlow border border-electric-indigo/30 shadow-glow-indigo font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-electric-indigo' : 'text-slate-400'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!sidebarCollapsed && item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                    item.id === 'processes'
                      ? 'bg-electric-emerald/20 text-electric-emerald border border-electric-emerald/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Quick Add Directory Button */}
      <div className="px-2 py-1">
        <button
          onClick={scanAndAddDirectory}
          disabled={isScanning}
          title="Add local project directory"
          className={`w-full flex items-center justify-center rounded-lg border border-dashed border-slate-700 hover:border-electric-indigo/60 bg-obsidian-850 hover:bg-electric-indigo/10 text-slate-300 hover:text-electric-indigo text-xs transition-all ${
            sidebarCollapsed ? 'p-2' : 'px-3 py-2 space-x-2'
          }`}
        >
          <FolderPlus className={`w-4 h-4 ${isScanning ? 'animate-spin text-electric-indigo' : ''}`} />
          {!sidebarCollapsed && (
            <span className="font-medium truncate font-mono">
              {isScanning ? 'Scanning...' : 'Import Project'}
            </span>
          )}
        </button>
      </div>

      {/* Favorites Section (When Expanded) */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            <span className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Favorites ({favorites.length})</span>
            </span>
          </div>

          {favorites.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-slate-600 italic font-mono">
              Star projects for quick launching.
            </div>
          ) : (
            favorites.map((fav) => {
              const isRunning = runningProcesses.some((p) => p.projectId === fav.id)
              return (
                <div
                  key={fav.id}
                  onClick={() => {
                    setSelectedProjectId(fav.id)
                    setActiveView('project-detail')
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 transition-colors group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isRunning ? 'bg-electric-emerald animate-pulse shadow-glow-emerald' : 'bg-slate-600'
                      }`}
                    />
                    <span className="truncate font-medium">{fav.name}</span>
                  </div>

                  <span className="text-[9px] font-mono text-slate-500 group-hover:text-electric-indigo uppercase">
                    {fav.framework || fav.project_type}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Bottom Terminal Drawer Toggle */}
      <div className="p-2 border-t border-slate-800 bg-obsidian-950/60 flex flex-col space-y-1">
        <button
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            isTerminalOpen
              ? 'bg-electric-indigo/20 text-electric-indigoGlow border border-electric-indigo/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title="Toggle xterm.js Terminal Drawer"
        >
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5" />
            {!sidebarCollapsed && <span>Drawer</span>}
          </div>
          {!sidebarCollapsed && runningProcesses.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-electric-emerald animate-pulse" />
          )}
        </button>

        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
