import React from 'react'
import {
  Play,
  Square,
  FolderOpen,
  GitBranch,
  Globe,
  Plus,
  RefreshCw,
  ExternalLink,
  Code
} from 'lucide-react'
import { useProjectStore } from '../stores/useProjectStore'
import { useProcessStore } from '../stores/useProcessStore'

export const Dashboard: React.FC = () => {
  const { projects, selectProject, setActiveView, addProjectByDirectory, refreshProject } =
    useProjectStore()
  const { runningProcesses, startProcess, stopProcess, setIsPreviewOpen, setPreviewUrl } =
    useProcessStore()

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090d16]">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Project Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage, launch, and monitor local projects in-place without moving or altering them.
          </p>
        </div>

        <button
          onClick={addProjectByDirectory}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project Directory</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto my-12 bg-slate-900/20">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Projects Tracked</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add a folder containing any Node.js, Next.js, Vite, Python, or Rust project. Nexus Launcher leaves all files where they are on disk.
          </p>
          <button
            onClick={addProjectByDirectory}
            className="mt-5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-xs transition-colors"
          >
            Select Project Folder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const runningProc = runningProcesses.find((p) => p.projectId === project.id)
            const isRunning = Boolean(runningProc)
            const primaryScript = project.scripts['dev']
              ? 'dev'
              : project.scripts['start']
              ? 'start'
              : project.scripts['run']
              ? 'run'
              : Object.keys(project.scripts)[0]

            return (
              <div
                key={project.id}
                onClick={() => {
                  selectProject(project.id)
                  setActiveView('detail')
                }}
                className="group relative bg-[#0d1322] border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition-all hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors truncate max-w-[180px]">
                        {project.name}
                      </h4>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#131d35] text-slate-300 border border-slate-700/60">
                      {project.framework || project.type}
                    </span>
                  </div>

                  {/* Path */}
                  <p className="text-[11px] text-slate-500 font-mono mt-1.5 truncate" title={project.path}>
                    {project.path}
                  </p>

                  {/* Metadata pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {project.gitBranch && (
                      <span className="flex items-center space-x-1 text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
                        <GitBranch className="w-2.5 h-2.5 text-indigo-400" />
                        <span>{project.gitBranch}</span>
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
                      {project.packageManager}
                    </span>

                    {runningProc?.detectedPort && (
                      <span className="flex items-center space-x-1 text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-mono">
                        <Globe className="w-2.5 h-2.5" />
                        <span>:{runningProc.detectedPort}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isRunning ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          stopProcess(runningProc!.processId)
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    ) : (
                      primaryScript && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startProcess({ projectId: project.id, scriptName: primaryScript })
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-xs transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Run {primaryScript}</span>
                        </button>
                      )
                    )}

                    {runningProc?.detectedPort && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewUrl(`http://localhost:${runningProc.detectedPort}`)
                          setIsPreviewOpen(true)
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-sky-400 hover:text-sky-300"
                        title="Open Live Preview"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        refreshProject(project.id)
                      }}
                      title="Rescan project"
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.nexus.system.openPath(project.path)
                      }}
                      title="Open in Windows Explorer"
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
