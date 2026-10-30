import React, { useState } from 'react'
import { FileCode, AlertTriangle, Check, ShieldAlert, CheckCircle2, X } from 'lucide-react'
import { useAIStore } from '../stores/useAIStore'
import { useProjectStore } from '../stores/useProjectStore'

export const PatchReview: React.FC = () => {
  const { currentPatch, setCurrentPatch, applyCurrentPatch, patchApplyStatus } = useAIStore()
  const { projects } = useProjectStore()
  const [confirmed, setConfirmed] = useState(false)
  const [applying, setApplying] = useState(false)

  const targetProject = projects.find((p) => p.id === currentPatch?.projectId)

  if (!currentPatch) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs bg-[#090d16] p-6 space-y-3">
        <FileCode className="w-8 h-8 text-slate-700" />
        <p>No active patch queued for review.</p>
        <p className="text-[11px] text-slate-600 max-w-sm text-center">
          Run an AI Diagnosis on runtime errors to generate an automated patch proposal.
        </p>
      </div>
    )
  }

  const handleApply = async () => {
    if (!confirmed) {
      alert('Please check the confirmation box acknowledging repository safety rules.')
      return
    }

    setApplying(true)
    try {
      await applyCurrentPatch()
    } finally {
      setApplying(false)
    }
  }

  // Parse diff lines for coloring
  const diffLines = currentPatch.unifiedDiff.split(/\r?\n/)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090d16]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <span>Interactive Patch Review</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict Non-Negotiable: Never modify files silently. Inspect, review, and explicitly confirm any diff.
          </p>
        </div>

        <button
          onClick={() => setCurrentPatch(null)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Dismiss Patch</span>
        </button>
      </div>

      {/* Target details */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Target File</span>
          <p className="text-sm font-mono font-bold text-sky-400 mt-0.5">
            {currentPatch.filePath}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Project: <strong className="text-slate-300">{targetProject?.name || currentPatch.projectId}</strong>
          </p>
        </div>

        <div className="text-right max-w-md">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Patch Intent</span>
          <p className="text-xs text-slate-300 mt-0.5">{currentPatch.explanation}</p>
        </div>
      </div>

      {/* Unified Diff Visualizer */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-[#131d35] border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-mono text-slate-300 font-medium">Unified Diff Preview</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {diffLines.filter((l) => l.startsWith('+')).length} additions,{' '}
            {diffLines.filter((l) => l.startsWith('-')).length} deletions
          </span>
        </div>

        <div className="p-4 bg-[#090d16] font-mono text-[11px] leading-relaxed overflow-x-auto select-text">
          {diffLines.map((line, idx) => {
            let lineClass = 'text-slate-400'
            let bgClass = ''

            if (line.startsWith('+') && !line.startsWith('+++')) {
              lineClass = 'text-emerald-400 font-semibold'
              bgClass = 'bg-emerald-500/10'
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              lineClass = 'text-red-400 font-semibold'
              bgClass = 'bg-red-500/10'
            } else if (line.startsWith('@')) {
              lineClass = 'text-sky-400 font-bold'
              bgClass = 'bg-sky-500/5'
            }

            return (
              <div key={idx} className={`px-2 py-0.5 rounded-sm flex items-center ${bgClass}`}>
                <span className="w-8 shrink-0 text-slate-600 select-none text-[10px]">{idx + 1}</span>
                <span className={`whitespace-pre ${lineClass}`}>{line}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Application Status Alert */}
      {patchApplyStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
            patchApplyStatus.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {patchApplyStatus.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {patchApplyStatus.success ? 'Patch Applied Successfully' : 'Application Error'}
            </div>
            <div>{patchApplyStatus.message}</div>
          </div>
        </div>
      )}

      {/* Safety Confirmation & Apply Button */}
      <div className="bg-[#0d1322] border border-amber-500/30 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-200">User Explicit Consent Required</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              This action will write changes to <span className="text-sky-300 font-mono">{currentPatch.filePath}</span> inside your repository. An audit record is logged to Nexus SQLite storage.
            </p>
            <label className="flex items-center space-x-2 mt-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
              />
              <span>I have reviewed the unified diff and authorize this change.</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleApply}
          disabled={!confirmed || applying}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-600/20 shrink-0"
        >
          <Check className="w-4 h-4" />
          <span>{applying ? 'Writing Changes...' : 'Apply Patch to File'}</span>
        </button>
      </div>
    </div>
  )
}
