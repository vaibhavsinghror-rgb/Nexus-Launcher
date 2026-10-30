import React, { useState } from 'react'
import {
  Play,
  Square,
  FolderOpen,
  Code2,
  Trash2,
  Star,
  GitBranch,
  Terminal,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Layers
} from 'lucide-react'
import type { ProjectRecord, LaunchProfileRecord } from '../../../shared/ipc-types'
import { useLauncherStore } from '../stores/useLauncherStore'
import { useProcessStore } from '../stores/useProcessStore'

interface ProjectCardProps {
  project: ProjectRecord
  viewMode?: 'grid' | 'list'
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, viewMode = 'grid' }) => {
  const {
    setSelectedProjectId,
    setActiveView,
    toggleFavorite,
    deleteProject,
    openInVsCode,
    openInExplorer,
    launchProfiles,
    projectGitStatuses
  } = useLauncherStore()

  const { runningProcesses, startProcess, stopProcess } = useProcessStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const runningProc = runningProcesses.find((p) => p.projectId === project.id)
  const isRunning = Boolean(runningProc)

  const git = projectGitStatuses[project.id]
  const profiles = launchProfiles[project.id] || []
  const defaultProfile = profiles.find((p) => p.is_default === 1) || profiles[0]

  const hasPythonVenv = Boolean(project.python_venv_path)

  let tags: string[] = []
  try {
    tags = JSON.parse(project.tags_json || '[]')
  } catch {
    tags = []
  }

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRunning) {
      stopProcess(runningProc!.processId)
    } else {
      startProcess({
        projectId: project.id,
        profileId: defaultProfile?.id,
        scriptName: 'dev'
      })
      setActiveView('processes')
    }
  }

  const handleCardClick = () => {
    setSelectedProjectId(project.id)
    setActiveView('project-detail')
  }

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteProject(project.id)
    setShowDeleteModal(false)
  }

  if (viewMode === 'list') {
    return (
      <>
        <div
          onClick={handleCardClick}
          className={`px-4 py-3 bg-obsidian-850 hover:bg-obsidian-800 border rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
            isRunning ? 'border-electric-emerald/40 shadow-glow-emerald' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          {/* Left Title & Tech Stack */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isRunning ? 'bg-electric-emerald animate-pulse shadow-glow-emerald' : 'bg-slate-600'
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-electric-indigoGlow truncate">
                  {project.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300 uppercase border border-slate-700/60">
                  {project.framework || project.project_type}
                </span>
                {hasPythonVenv && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    title={`Virtual Env: ${project.python_venv_path}`}
                  >
                    .venv
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5" title={project.path}>
                {project.path}
              </p>
            </div>
          </div>

          {/* Middle: Git & Port indicators */}
          <div className="hidden lg:flex items-center space-x-3 text-xs font-mono px-4">
            {git?.branch && (
              <span className="flex items-center space-x-1 text-slate-400">
                <GitBranch className="w-3 h-3 text-electric-indigo" />
                <span>{git.branch}</span>
                {git.dirtyCount > 0 && (
                  <span className="text-[10px] text-amber-400">({git.dirtyCount}*)</span>
                )}
              </span>
            )}

            {runningProc?.detectedPort && (
              <span className="text-electric-cyan font-bold">
                :{runningProc.detectedPort}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(project.id)
              }}
              className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
                project.is_favorite === 1 ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <Star className={`w-4 h-4 ${project.is_favorite === 1 ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                openInVsCode(project.path)
              }}
              title="Open in VS Code"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-electric-cyan transition-colors"
            >
              <Code2 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                openInExplorer(project.path)
              }}
              title="Open in Windows Explorer"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            <button
              onClick={handleLaunch}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
                isRunning
                  ? 'bg-electric-rose/15 hover:bg-electric-rose/25 text-electric-rose border border-electric-rose/30'
                  : 'bg-electric-emerald/15 hover:bg-electric-emerald/25 text-electric-emerald border border-electric-emerald/30 shadow-glow-emerald'
              }`}
            >
              {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'STOP' : 'LAUNCH'}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteModal(true)
              }}
              title="Remove from Nexus"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-600 hover:text-electric-rose transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-obsidian-950 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-electric-rose shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-mono">
                    Untrack Project from Nexus?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    This removes <strong>{project.name}</strong> from Nexus Launcher's SQLite database ONLY. Your repository and files on disk are completely untouched.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteModal(false)
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-1.5 rounded-lg bg-electric-rose hover:bg-rose-600 text-white text-xs font-mono font-bold"
                >
                  Remove Record
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Grid Card View
  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-obsidian-850 hover:bg-obsidian-800 border rounded-xl p-4.5 transition-all flex flex-col justify-between cursor-pointer group relative ${
          isRunning ? 'border-electric-emerald/50 shadow-glow-emerald' : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <div>
          {/* Top Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isRunning ? 'bg-electric-emerald animate-pulse shadow-glow-emerald' : 'bg-slate-600'
                }`}
              />
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-electric-indigoGlow truncate">
                {project.name}
              </h3>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(project.id)
                }}
                className={`p-1 rounded transition-colors ${
                  project.is_favorite === 1 ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${project.is_favorite === 1 ? 'fill-amber-400' : ''}`} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="p-1 text-slate-600 hover:text-slate-300 transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Context Menu Dropdown */}
          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-10 w-44 bg-obsidian-950 border border-slate-700 rounded-lg shadow-xl p-1 z-30 text-xs font-mono space-y-0.5"
            >
              <button
                onClick={() => {
                  openInVsCode(project.path)
                  setShowMenu(false)
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center space-x-2"
              >
                <Code2 className="w-3.5 h-3.5 text-electric-cyan" />
                <span>Open in VS Code</span>
              </button>

              <button
                onClick={() => {
                  openInExplorer(project.path)
                  setShowMenu(false)
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center space-x-2"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Open in Explorer</span>
              </button>

              <div className="h-px bg-slate-800 my-1" />

              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowDeleteModal(true)
                }}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-electric-rose/10 text-electric-rose flex items-center space-x-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from Nexus</span>
              </button>
            </div>
          )}

          {/* Path Badge */}
          <div
            className="text-[11px] font-mono text-slate-500 mt-1 truncate"
            title={project.path}
          >
            {project.path}
          </div>

          {/* Brief preview if present */}
          {project.brief && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              {project.brief}
            </p>
          )}

          {/* Tech Stack Pills & Indicators */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {project.framework || project.project_type}
            </span>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-800">
              {project.primary_language}
            </span>

            {hasPythonVenv && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1"
                title={`Isolated Python Environment: ${project.python_venv_path}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>venv active</span>
              </span>
            )}

            {git?.branch && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-electric-indigo/15 text-electric-indigoGlow border border-electric-indigo/30 flex items-center space-x-1">
                <GitBranch className="w-2.5 h-2.5" />
                <span>{git.branch}</span>
                {git.dirtyCount > 0 && <span className="text-amber-400">({git.dirtyCount}*)</span>}
              </span>
            )}

            {runningProc?.detectedPort && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-electric-cyan/15 text-electric-cyan border border-electric-cyan/30 font-bold flex items-center space-x-1">
                <Globe className="w-2.5 h-2.5" />
                <span>:{runningProc.detectedPort}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={handleLaunch}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 ${
              isRunning
                ? 'bg-electric-rose/15 hover:bg-electric-rose/25 text-electric-rose border border-electric-rose/30'
                : 'bg-electric-emerald/15 hover:bg-electric-emerald/25 text-electric-emerald border border-electric-emerald/30 shadow-glow-emerald'
            }`}
          >
            {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'STOP' : 'LAUNCH'}</span>
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                openInVsCode(project.path)
              }}
              title="Open in VS Code"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-electric-cyan transition-colors"
            >
              <Code2 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                openInExplorer(project.path)
              }}
              title="Open in Windows Explorer"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-obsidian-950 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-electric-rose shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Untrack Project from Nexus?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  This removes <strong>{project.name}</strong> from Nexus Launcher's SQLite database ONLY. Your repository and files on disk are completely untouched.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteModal(false)
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-lg bg-electric-rose hover:bg-rose-600 text-white text-xs font-mono font-bold"
              >
                Remove Record
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
