import React, { useState } from 'react'
import {
  Sparkles,
  AlertTriangle,
  FileCode,
  Terminal,
  Copy,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Cpu,
  Clock,
  ShieldCheck,
  Play
} from 'lucide-react'
import { useAIStore } from '../stores/useAIStore'
import { useProcessStore } from '../stores/useProcessStore'
import { useLauncherStore } from '../stores/useLauncherStore'
import { usePatchStore } from '../stores/usePatchStore'

export const CrashDiagnosticModal: React.FC = () => {
  const {
    isDiagnosticModalOpen,
    isDiagnosing,
    activeReport,
    diagnosticError,
    config,
    closeDiagnosticModal,
    cancelDiagnosis
  } = useAIStore()

  const { spawnShell, sendTerminalInput, setIsTerminalOpen } = useProcessStore()
  const { selectedProjectId, activeProject } = useLauncherStore()
  const { preparePatch } = usePatchStore()

  const [copied, setCopied] = useState(false)
  const [isRunningCommand, setIsRunningCommand] = useState(false)

  if (!isDiagnosticModalOpen) {
    return null
  }

  const handleCopyCommand = () => {
    if (!activeReport?.recommendedCommand) return
    navigator.clipboard.writeText(activeReport.recommendedCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunInShell = async () => {
    if (!activeReport?.recommendedCommand || isRunningCommand) return
    setIsRunningCommand(true)
    try {
      const shellProc = await spawnShell(selectedProjectId || undefined)
      setIsTerminalOpen(true)
      // Send the fix command into the new shell session
      sendTerminalInput(shellProc.processId, `${activeReport.recommendedCommand}\r\n`)
      closeDiagnosticModal()
    } catch (err) {
      console.error('Failed to run fix command in shell:', err)
    } finally {
      setIsRunningCommand(false)
    }
  }

  const handleOpenFileInVsCode = () => {
    if (activeReport?.fileReference?.file) {
      window.nexus.system.openInVsCode(activeReport.fileReference.file)
    }
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Missing Dependency':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'Port Conflict':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
      case 'Venv Mismatch':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      case 'Syntax/Import Error':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      case 'Missing Env Var':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-700'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-obsidian-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-obsidian-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
                <span>AI Crash Diagnostics</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-obsidian-800 text-slate-400 font-normal">
                  Local-First Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Bounded context root-cause analysis via {config.provider} ({config.model})
              </p>
            </div>
          </div>

          <button
            onClick={closeDiagnosticModal}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* Loading State */}
          {isDiagnosing && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-sm font-bold text-slate-200">
                  Diagnosing Process Failure...
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Redacting secrets, inspecting stack trace frames, and querying local model{' '}
                  <span className="font-mono text-indigo-400">{config.model}</span>.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={cancelDiagnosis}
                  className="px-3 py-1.5 rounded-lg bg-obsidian-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs transition-colors border border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isDiagnosing && diagnosticError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center space-x-2 font-mono font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Diagnosis Failed</span>
              </div>
              <p className="text-xs text-rose-300/90 font-mono">{diagnosticError}</p>
              <p className="text-[11px] text-slate-400 pt-1">
                Ensure your local AI provider ({config.provider} at {config.baseUrl}) is running and
                has model <code className="text-indigo-400">{config.model}</code> loaded.
              </p>
            </div>
          )}

          {/* Diagnostic Report Display */}
          {!isDiagnosing && activeReport && (
            <div className="space-y-4">
              {/* Top Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${getCategoryColor(
                    activeReport.rootCauseCategory
                  )}`}
                >
                  {activeReport.rootCauseCategory}
                </span>

                <span className="px-2 py-0.5 rounded text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Exit Code: {activeReport.exitCode}
                </span>

                <span className="px-2 py-0.5 rounded text-xs font-mono bg-obsidian-800 text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {activeReport.latencyMs} ms
                </span>

                <span className="px-2 py-0.5 rounded text-xs font-mono bg-obsidian-800 text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Secrets Redacted
                </span>
              </div>

              {/* Observed Evidence */}
              <div className="p-3 bg-obsidian-900 border border-slate-800/80 rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Observed Failure Evidence
                </div>
                <div className="font-mono text-xs text-slate-200 break-all select-text bg-obsidian-950 p-2 rounded border border-slate-800/50">
                  {activeReport.observedEvidence}
                </div>
              </div>

              {/* File & Line Reference */}
              {activeReport.fileReference?.file && (
                <div className="flex items-center justify-between p-3 bg-obsidian-900 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <FileCode className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400">Triggering Source: </span>
                      <span className="text-slate-200 font-semibold">
                        {activeReport.fileReference.file}
                      </span>
                      {activeReport.fileReference.line && (
                        <span className="text-indigo-400 font-bold">
                          :{activeReport.fileReference.line}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleOpenFileInVsCode}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-obsidian-800 hover:bg-slate-800 text-slate-300 rounded text-xs font-mono transition-colors border border-slate-700 ml-2"
                  >
                    <span>Open in VS Code</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Explanation & Root Cause */}
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Root Cause Analysis
                </h4>
                <div className="text-slate-300 leading-relaxed bg-obsidian-900/60 p-3 rounded-xl border border-slate-800 text-xs">
                  {activeReport.explanation}
                </div>
              </div>

              {/* Recommended Fix */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Recommended Resolution
                </h4>
                <div className="text-slate-300 bg-obsidian-900/60 p-3 rounded-xl border border-slate-800 text-xs leading-relaxed">
                  {activeReport.recommendedFix}
                </div>

                {/* Recommended Terminal Command */}
                {activeReport.recommendedCommand && (
                  <div className="mt-2 bg-obsidian-950 border border-indigo-500/30 rounded-xl p-3 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <Terminal className="w-3 h-3" />
                        Resolution Command
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={handleCopyCommand}
                          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-obsidian-850 hover:bg-slate-800 text-slate-300 text-[11px] font-mono transition-colors border border-slate-800"
                        >
                          {copied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={handleRunInShell}
                          disabled={isRunningCommand}
                          className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono font-medium transition-colors shadow-sm"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Run in Nexus Terminal</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-2.5 bg-obsidian-900 rounded font-mono text-xs text-emerald-400 overflow-x-auto select-text border border-slate-800/80">
                      {activeReport.recommendedCommand}
                    </pre>
                  </div>
                )}

                {/* Proposed Code Patch Action */}
                {activeReport.suggestedPatch && selectedProjectId && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        preparePatch({
                          projectId: selectedProjectId,
                          filePath: activeReport.suggestedPatch!.filePath,
                          proposedCode: activeReport.suggestedPatch!.diff,
                          explanation: activeReport.explanation
                        })
                        closeDiagnosticModal()
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Review & Apply Proposed Code Fix (Diff)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-obsidian-900/60 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            Model: {config.model} • Privacy: 100% On-Device
          </span>
          <button
            onClick={closeDiagnosticModal}
            className="px-4 py-1.5 rounded-lg bg-obsidian-800 hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
