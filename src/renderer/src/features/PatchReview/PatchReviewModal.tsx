import React, { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  Play,
  FileCode,
  Sparkles,
  AlertTriangle,
  History,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react'
import { usePatchStore } from '../../stores/usePatchStore'
import { useProcessStore } from '../../stores/useProcessStore'
import { useLauncherStore } from '../../stores/useLauncherStore'
import { UnifiedDiffViewer } from './UnifiedDiffViewer'

export const PatchReviewModal: React.FC = () => {
  const {
    activePreview,
    currentProjectId,
    isReviewOpen,
    isApplying,
    isRollingBack,
    applyResult,
    rollbackResult,
    patchHistory,
    applyPatch,
    rollbackPatch,
    closeReview
  } = usePatchStore()

  const { startProcess, setIsTerminalOpen } = useProcessStore()
  const { launchProfiles, projects } = useLauncherStore()

  const [activeTab, setActiveTab] = useState<'diff' | 'history'>('diff')

  if (!isReviewOpen || !activePreview) {
    return null
  }

  const project = projects.find((p) => p.id === currentProjectId)
  const pProfiles = currentProjectId ? launchProfiles[currentProjectId] || [] : []
  const defaultProfile = pProfiles.find((lp) => lp.is_default === 1) || pProfiles[0]

  const handleRerunProject = async () => {
    if (!currentProjectId) return
    closeReview()
    await startProcess({
      projectId: currentProjectId,
      profileId: defaultProfile?.id,
      scriptName: 'dev'
    })
    setIsTerminalOpen(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div className="relative w-full max-w-4xl bg-obsidian-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header: Workflow Stage Indicator */}
        <div className="px-6 py-4 border-b border-slate-800 bg-obsidian-900/90 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <FileCode className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
                  <span>Human-in-the-Loop Code Repair</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Safe Boundary Guard
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Target: <span className="font-mono text-slate-200">{activePreview.relativePath}</span>
                </p>
              </div>
            </div>

            <button
              onClick={closeReview}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workflow Pipeline Breadcrumbs */}
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
            <span className="text-slate-400">1. Diagnose</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-400">2. Propose</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-indigo-400 font-bold">3. Review</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className={applyResult?.success ? 'text-emerald-400 font-bold' : ''}>
              4. Approve & Apply
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className={applyResult?.success ? 'text-cyan-400 font-bold' : ''}>5. Verify</span>
          </div>
        </div>

        {/* Tab Switcher & Metadata Row */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-obsidian-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1.5 rounded-lg font-mono transition-colors ${
                activeTab === 'diff'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Unified Diff
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Snapshot Backups ({patchHistory.length})</span>
            </button>
          </div>

          {/* Validation Status Badges */}
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            {activePreview.valid ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Root Bounded
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                <ShieldAlert className="w-3 h-3" />
                Invalid Path
              </span>
            )}

            <span className="text-slate-500 bg-obsidian-900 px-2 py-0.5 rounded border border-slate-800">
              SHA-256: {activePreview.fileHashBefore.substring(0, 8)}...
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
          {activeTab === 'diff' ? (
            <>
              {/* AI Explanation Banner */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Proposed Modification Rationale
                </div>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {activePreview.explanation || 'Automated code repair plan generated by Nexus.'}
                </p>
              </div>

              {/* Status or Error Notifications */}
              {applyResult && (
                <div
                  className={`p-3.5 rounded-xl border space-y-1 ${
                    applyResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-mono font-bold">
                    {applyResult.success ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{applyResult.success ? 'Patch Applied Successfully' : 'Patch Application Failed'}</span>
                  </div>
                  <p className="text-xs">{applyResult.message}</p>
                  {applyResult.error && <p className="text-xs font-mono">{applyResult.error}</p>}
                </div>
              )}

              {rollbackResult && (
                <div className="p-3.5 rounded-xl border bg-cyan-500/10 border-cyan-500/30 text-cyan-300 space-y-1">
                  <div className="flex items-center space-x-2 font-mono font-bold">
                    <RotateCcw className="w-4 h-4 text-cyan-400" />
                    <span>Rollback Status</span>
                  </div>
                  <p className="text-xs">{rollbackResult.message}</p>
                </div>
              )}

              {/* Interactive Diff Display */}
              <div>
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Unified Diff Preview</span>
                  <span className="text-slate-500 text-[10px]">Green (+ additions) • Red (- deletions)</span>
                </div>
                <UnifiedDiffViewer diff={activePreview.unifiedDiff} />
              </div>
            </>
          ) : (
            /* Historical SQLite Snapshot Backups */
            <div className="space-y-3">
              <div className="text-slate-400 text-xs">
                Every patch applied through Nexus is automatically backed up in SQLite before touching
                disk. Click rollback to restore any previous version instantly.
              </div>

              {patchHistory.length > 0 ? (
                <div className="space-y-2">
                  {patchHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl bg-obsidian-900 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-200">
                            {rec.relativePath}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              rec.status === 'applied'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {rec.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{rec.explanation}</p>
                        <div className="text-[10px] font-mono text-slate-500">
                          Applied: {new Date(rec.appliedAt).toLocaleString()}
                        </div>
                      </div>

                      {rec.status === 'applied' && (
                        <button
                          onClick={() => rollbackPatch(rec.id)}
                          disabled={isRollingBack}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-obsidian-800 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded-lg text-xs font-mono transition-colors border border-slate-700"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Rollback</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No previous patch records stored in SQLite for this project.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-obsidian-900/90 flex items-center justify-between select-none">
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Zero Unattended Edits • In-Place Verification</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={closeReview}
              className="px-4 py-2 rounded-xl bg-obsidian-850 hover:bg-slate-800 text-slate-300 font-mono text-xs font-medium transition-colors border border-slate-700"
            >
              Cancel
            </button>

            {applyResult?.success ? (
              <button
                onClick={handleRerunProject}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-electric-cyan/20 hover:bg-electric-cyan/30 text-electric-cyan font-mono text-xs font-bold transition-colors border border-electric-cyan/40 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Rerun Project & Verify</span>
              </button>
            ) : (
              <button
                onClick={applyPatch}
                disabled={!activePreview.valid || isApplying}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{isApplying ? 'Applying Patch...' : 'Approve & Apply Patch'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
