import React, { useEffect, useState } from 'react'
import { Cpu, RefreshCw, AlertCircle, CheckCircle2, ArrowRight, Sparkles, Terminal } from 'lucide-react'
import { useAIStore } from '../stores/useAIStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useProcessStore } from '../stores/useProcessStore'

export const AIDiagnostics: React.FC = () => {
  const {
    config,
    setConfig,
    isOnline,
    healthMessage,
    availableModels,
    isCheckingHealth,
    isDiagnosing,
    lastDiagnosis,
    checkHealth,
    loadModels,
    diagnoseError
  } = useAIStore()

  const { projects, selectedProjectId, setActiveView } = useProjectStore()
  const { runningProcesses, logsByProcessId, activeProcessId } = useProcessStore()

  const [targetProjectId, setTargetProjectId] = useState<string>(selectedProjectId || '')
  const [errorLogsInput, setErrorLogsInput] = useState<string>('')

  useEffect(() => {
    checkHealth()
  }, [])

  useEffect(() => {
    if (selectedProjectId && !targetProjectId) {
      setTargetProjectId(selectedProjectId)
    }
  }, [selectedProjectId, targetProjectId])

  const handleLoadStderrFromActiveProcess = () => {
    const activeProc = runningProcesses.find((p) => p.processId === activeProcessId) || runningProcesses[0]
    if (!activeProc) return

    setTargetProjectId(activeProc.projectId)
    const logs = logsByProcessId[activeProc.processId] || []
    const stderrOrErrors = logs
      .filter((l) => l.level === 'stderr' || l.message.toLowerCase().includes('error') || l.message.toLowerCase().includes('exception'))
      .map((l) => l.message)
      .join('\n')

    setErrorLogsInput(stderrOrErrors || logs.slice(-30).map((l) => l.message).join('\n'))
  }

  const handleRunDiagnosis = () => {
    if (!targetProjectId) {
      alert('Please select a project for context.')
      return
    }
    diagnoseError(targetProjectId, errorLogsInput)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-[#090d16]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>AI Diagnostics & Troubleshooting</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnose build errors, runtime exceptions, and port conflicts using local models (Ollama / LM Studio) or OpenAI-compatible endpoints.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {isOnline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Provider Connected' : 'Offline'}</span>
          </span>

          <button
            onClick={checkHealth}
            disabled={isCheckingHealth}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Check connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Provider Configuration Card */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Provider Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Provider Engine</label>
            <select
              value={config.provider}
              onChange={(e) => {
                const prov = e.target.value as any
                const baseUrl =
                  prov === 'ollama'
                    ? 'http://localhost:11434'
                    : prov === 'lmstudio'
                    ? 'http://localhost:1234/v1'
                    : 'http://localhost:8000/v1'
                setConfig({ provider: prov, baseUrl })
              }}
              className="w-full bg-[#131d35] border border-slate-700/60 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="lmstudio">LM Studio (Local)</option>
              <option value="openai_compatible">OpenAI-Compatible Endpoint</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ baseUrl: e.target.value })}
              className="w-full bg-[#131d35] border border-slate-700/60 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Model Name</label>
            {availableModels.length > 0 ? (
              <select
                value={config.model}
                onChange={(e) => setConfig({ model: e.target.value })}
                className="w-full bg-[#131d35] border border-slate-700/60 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ model: e.target.value })}
                placeholder="e.g. llama3:latest"
                className="w-full bg-[#131d35] border border-slate-700/60 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-slate-400 mb-1">API Key (Optional)</label>
            <input
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ apiKey: e.target.value })}
              placeholder="Leave empty for local"
              className="w-full bg-[#131d35] border border-slate-700/60 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none"
            />
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">Status: {healthMessage}</div>
      </div>

      {/* Diagnostics Input Card */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Diagnostic Target & Error Logs
            </h3>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="bg-[#131d35] border border-slate-700/60 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">Select Project Context...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.framework || p.type})
                </option>
              ))}
            </select>
          </div>

          {runningProcesses.length > 0 && (
            <button
              onClick={handleLoadStderrFromActiveProcess}
              className="flex items-center space-x-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Import Stderr from Active Process</span>
            </button>
          )}
        </div>

        <textarea
          rows={6}
          value={errorLogsInput}
          onChange={(e) => setErrorLogsInput(e.target.value)}
          placeholder="Paste compiler, terminal, build, or runtime error logs here..."
          className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
        />

        <div className="flex justify-end">
          <button
            onClick={handleRunDiagnosis}
            disabled={isDiagnosing || !errorLogsInput.trim()}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Sparkles className={`w-4 h-4 ${isDiagnosing ? 'animate-spin' : ''}`} />
            <span>{isDiagnosing ? 'Analyzing Context...' : 'Analyze with AI'}</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      {lastDiagnosis && (
        <div className="bg-[#0d1322] border border-indigo-500/30 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Diagnosis Analysis</span>
            </h3>

            {lastDiagnosis.suggestedPatch && (
              <button
                onClick={() => setActiveView('patch')}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors border border-emerald-500/20"
              >
                <span>Review Proposed Patch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Summary Analysis:</span>
              <p className="text-slate-200 leading-relaxed bg-[#131d35]/60 p-3 rounded-lg border border-slate-800">
                {lastDiagnosis.analysis}
              </p>
            </div>

            <div>
              <span className="text-amber-400 font-semibold block mb-0.5">Identified Root Cause:</span>
              <p className="text-slate-200 leading-relaxed bg-[#131d35]/60 p-3 rounded-lg border border-slate-800">
                {lastDiagnosis.rootCause}
              </p>
            </div>

            <div>
              <span className="text-emerald-400 font-semibold block mb-0.5">Actionable Fix:</span>
              <p className="text-slate-200 leading-relaxed bg-[#131d35]/60 p-3 rounded-lg border border-slate-800">
                {lastDiagnosis.suggestedFix}
              </p>
            </div>

            {lastDiagnosis.suggestedPatch && (
              <div>
                <span className="text-sky-400 font-semibold block mb-0.5">Suggested Diff / Code:</span>
                <pre className="bg-[#090d16] p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                  {lastDiagnosis.suggestedPatch}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
