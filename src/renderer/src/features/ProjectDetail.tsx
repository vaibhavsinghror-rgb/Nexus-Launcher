import React, { useState } from 'react'
import {
  Play,
  Square,
  RotateCw,
  FolderOpen,
  GitBranch,
  KeyRound,
  Terminal,
  Activity,
  Globe,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { useProjectStore } from '../stores/useProjectStore'
import { useProcessStore } from '../stores/useProcessStore'

export const ProjectDetail: React.FC = () => {
  const {
    activeProject,
    currentGitStatus,
    currentEnvVars,
    removeProject,
    refreshProject,
    setActiveView
  } = useProjectStore()

  const {
    runningProcesses,
    startProcess,
    stopProcess,
    restartProcess,
    setIsTerminalOpen,
    setIsPreviewOpen,
    setPreviewUrl
  } = useProcessStore()

  const [showSecrets, setShowSecrets] = useState(false)
  const [portCheckResult, setPortCheckResult] = useState<string | null>(null)

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs bg-[#090d16]">
        Select a project from the sidebar to inspect its details.
      </div>
    )
  }

  const runningProc = runningProcesses.find((p) => p.projectId === activeProject.id)
  const isRunning = Boolean(runningProc)

  const handleCheckPort = async (port: number) => {
    const res = await window.nexus.process.checkPort(port)
    if (res.inUse) {
      setPortCheckResult(`Port :${port} is OCCUPIED (PID: ${res.pid || 'Unknown'}, Process: ${res.processName || 'Unknown'})`)
    } else {
      setPortCheckResult(`Port :${port} is FREE`)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090d16]">
      {/* Top Header Card */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-5 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-slate-100">{activeProject.name}</h2>
            <span className="text-xs uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#131d35] text-sky-400 border border-slate-700">
              {activeProject.framework || activeProject.type}
            </span>
            {isRunning && (
              <span className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Running</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 font-mono mt-1.5 flex items-center space-x-2">
            <span>{activeProject.path}</span>
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
            <span>Package Manager: <strong className="text-slate-200">{activeProject.packageManager}</strong></span>
            <span>•</span>
            <span>Scripts Defined: <strong className="text-slate-200">{Object.keys(activeProject.scripts).length}</strong></span>
            {activeProject.port && (
              <>
                <span>•</span>
                <span>Default Port: <strong className="text-sky-400 font-mono">:{activeProject.port}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <>
              <button
                onClick={() => restartProcess(runningProc!.processId)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              <button
                onClick={() => stopProcess(runningProc!.processId)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>

              {runningProc?.detectedPort && (
                <button
                  onClick={() => {
                    setPreviewUrl(`http://localhost:${runningProc.detectedPort}`)
                    setIsPreviewOpen(true)
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              )}
            </>
          ) : null}

          <button
            onClick={() => refreshProject(activeProject.id)}
            title="Rescan"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => window.nexus.system.openPath(activeProject.path)}
            title="Open Directory in Windows Explorer"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => removeProject(activeProject.id)}
            title="Untrack from Nexus (Leaves repository intact on disk)"
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: Scripts & Git/Env */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scripts runner */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>Project Scripts ({Object.keys(activeProject.scripts).length})</span>
            </h3>

            {Object.keys(activeProject.scripts).length === 0 ? (
              <p className="text-xs text-slate-500 italic">No scripts found in project configuration.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {Object.entries(activeProject.scripts).map(([scriptName, command]) => {
                  return (
                    <div
                      key={scriptName}
                      className="p-3 rounded-lg bg-[#131d35]/60 border border-slate-700/50 hover:border-slate-600 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-200">{scriptName}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate" title={command}>
                          {command}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          startProcess({ projectId: activeProject.id, scriptName })
                          setIsTerminalOpen(true)
                        }}
                        className="px-2.5 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center space-x-1 transition-colors shrink-0"
                      >
                        <Play className="w-3 h-3" />
                        <span>Run</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Environment Variables */}
          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Environment Configurations ({currentEnvVars.length})</span>
              </h3>

              {currentEnvVars.length > 0 && (
                <button
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSecrets ? 'Hide Masked' : 'Toggle Masked View'}</span>
                </button>
              )}
            </div>

            {currentEnvVars.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No .env or .env.local file detected in this project.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 font-mono text-xs">
                {currentEnvVars.map((v) => (
                  <div
                    key={v.key}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#131d35]/60 border border-slate-800"
                  >
                    <span className="text-sky-300 font-semibold">{v.key}</span>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="text-slate-400">{v.value}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                        {v.sourceFile}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Git status & Port Inspector */}
        <div className="space-y-4">
          {/* Git Status Card */}
          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              <span>Git Repository</span>
            </h3>

            {!currentGitStatus || !currentGitStatus.isGitRepo ? (
              <p className="text-xs text-slate-500 italic">Not a Git repository.</p>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Branch:</span>
                  <span className="font-mono text-sky-400 font-bold">{currentGitStatus.branch}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Working Tree:</span>
                  <span
                    className={`font-semibold ${
                      currentGitStatus.isClean ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {currentGitStatus.isClean ? 'Clean' : 'Modified files pending'}
                  </span>
                </div>

                {currentGitStatus.lastCommitMessage && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">Latest Commit</span>
                    <p className="text-slate-300 font-medium mt-0.5 line-clamp-2">
                      {currentGitStatus.lastCommitMessage}
                    </p>
                    <p className="text-slate-500 text-[10px] mt-1">
                      {currentGitStatus.lastCommitAuthor} • {currentGitStatus.lastCommitDate}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Port Checker Tool */}
          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Port Occupancy Check</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Verify if this project's port is free or held by another Windows process before starting.
            </p>

            {activeProject.port ? (
              <div>
                <button
                  onClick={() => handleCheckPort(activeProject.port!)}
                  className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Inspect Port :{activeProject.port}
                </button>
                {portCheckResult && (
                  <div className="mt-2.5 p-2 rounded bg-[#131d35] text-[11px] font-mono text-slate-300 border border-slate-700">
                    {portCheckResult}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No default port configured for this project.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
