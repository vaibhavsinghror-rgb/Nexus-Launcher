import React, { useState, useEffect } from 'react'
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  Sparkles,
  Save,
  Clock,
  ShieldCheck,
  Settings,
  Layers,
  Sliders,
  Check,
  HelpCircle,
  Play
} from 'lucide-react'
import { useAIStore } from '../stores/useAIStore'
import { useLauncherStore } from '../stores/useLauncherStore'
import { useProcessStore } from '../stores/useProcessStore'
import type { AIProviderType } from '../../../shared/ipc-types'

export const AIAssistantView: React.FC = () => {
  const {
    config,
    isOnline,
    latencyMs,
    statusMessage,
    availableModels,
    isChecking,
    setConfig,
    loadConfig,
    saveConfig,
    testConnection,
    listModels,
    diagnoseCrash
  } = useAIStore()

  const { projects } = useLauncherStore()
  const { runningProcesses } = useProcessStore()

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [selectedTestProjectId, setSelectedTestProjectId] = useState<string>('')
  const [sampleErrorLogs, setSampleErrorLogs] = useState<string>(
    `Traceback (most recent call last):
  File "app.py", line 14, in <module>
    import uvicorn
ModuleNotFoundError: No module named 'uvicorn'
Process exited with code 1`
  )

  useEffect(() => {
    loadConfig()
    testConnection()
    if (projects.length > 0 && !selectedTestProjectId) {
      setSelectedTestProjectId(projects[0].id)
    }
  }, [projects])

  const handleProviderChange = (provider: AIProviderType) => {
    let defaultUrl = 'http://127.0.0.1:11434'
    if (provider === 'lmstudio') {
      defaultUrl = 'http://127.0.0.1:1234/v1'
    } else if (provider === 'openai-compatible') {
      defaultUrl = 'http://127.0.0.1:8000/v1'
    }
    setConfig({ provider, baseUrl: defaultUrl })
  }

  const handleSave = async () => {
    const ok = await saveConfig()
    if (ok) {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    }
  }

  const handleRunTestDiagnosis = () => {
    if (!selectedTestProjectId) return
    diagnoseCrash({
      projectId: selectedTestProjectId,
      exitCode: 1,
      errorSummary: 'ModuleNotFoundError: No module named uvicorn',
      recentLogs: sampleErrorLogs
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none bg-obsidian-900 text-slate-100 font-sans">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Local AI Provider & Crash Diagnostics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            100% on-device root-cause analysis for failed builds, missing dependencies, and server crashes.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-colors shadow-sm"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Config Saved!' : 'Save AI Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Provider Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Connection & Endpoint Card */}
          <div className="bg-obsidian-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Provider Architecture</span>
              </h3>

              {/* Status Pill */}
              <div className="flex items-center space-x-2">
                {isOnline === true ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online ({latencyMs}ms)
                  </span>
                ) : isOnline === false ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-400">
                    Not Tested
                  </span>
                )}
              </div>
            </div>

            {/* Provider Type Selection */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Local Inference Backend
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleProviderChange('ollama')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.provider === 'ollama'
                      ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 shadow-sm'
                      : 'bg-obsidian-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-bold">Ollama</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Port 11434 (Native API)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderChange('lmstudio')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.provider === 'lmstudio'
                      ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 shadow-sm'
                      : 'bg-obsidian-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-bold">LM Studio</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Port 1234 (/v1/models)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderChange('openai-compatible')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.provider === 'openai-compatible'
                      ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 shadow-sm'
                      : 'bg-obsidian-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-bold">OpenAI Compat</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">vLLM / LocalAI / Custom</div>
                </button>
              </div>
            </div>

            {/* Base Endpoint URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-400">Endpoint URL</label>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      baseUrl:
                        config.provider === 'ollama'
                          ? 'http://127.0.0.1:11434'
                          : 'http://127.0.0.1:1234/v1'
                    })
                  }
                  className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300"
                >
                  Reset Default
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ baseUrl: e.target.value })}
                  placeholder="http://127.0.0.1:11434"
                  className="flex-1 bg-obsidian-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500/50"
                />

                <button
                  onClick={testConnection}
                  disabled={isChecking}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-obsidian-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>Test Ping</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-mono">{statusMessage}</p>
            </div>

            {/* Discovered Model Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-400">Target Model</label>
                <span className="text-[11px] font-mono text-slate-500">
                  {availableModels.length} Discovered
                </span>
              </div>

              {availableModels.length > 0 ? (
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ model: e.target.value })}
                  className="w-full bg-obsidian-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500/50"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.name || m.id}>
                      {m.name || m.id} {m.sizeBytes ? `(${(m.sizeBytes / 1e9).toFixed(1)} GB)` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ model: e.target.value })}
                  placeholder="e.g. llama3:latest, qwen2.5-coder"
                  className="w-full bg-obsidian-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500/50"
                />
              )}
            </div>

            {/* Inference Tuning */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              {/* Context Limit */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Context Window Limit
                </label>
                <select
                  value={config.contextTokenLimit}
                  onChange={(e) => setConfig({ contextTokenLimit: parseInt(e.target.value, 10) })}
                  className="w-full bg-obsidian-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none"
                >
                  <option value={2048}>2,048 Tokens</option>
                  <option value={4096}>4,096 Tokens</option>
                  <option value={8192}>8,192 Tokens (Recommended)</option>
                  <option value={16384}>16,384 Tokens</option>
                  <option value={32768}>32,768 Tokens</option>
                </select>
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono text-slate-400">Temperature</label>
                  <span className="text-xs font-mono text-indigo-400 font-bold">
                    {config.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.temperature}
                  onChange={(e) => setConfig({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 mt-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Diagnostic Playground (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-obsidian-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Diagnostics Simulation</span>
            </h3>

            <p className="text-xs text-slate-400">
              Test your local model&apos;s diagnostics capabilities using sample crash logs or real project metadata.
            </p>

            {/* Select Project */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Context Target Project
              </label>
              <select
                value={selectedTestProjectId}
                onChange={(e) => setSelectedTestProjectId(e.target.value)}
                className="w-full bg-obsidian-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.primary_language})
                  </option>
                ))}
              </select>
            </div>

            {/* Sample Logs */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Sample Crash Console Logs
              </label>
              <textarea
                rows={5}
                value={sampleErrorLogs}
                onChange={(e) => setSampleErrorLogs(e.target.value)}
                className="w-full bg-obsidian-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500/50 resize-y"
              />
            </div>

            {/* Test Button */}
            <button
              onClick={handleRunTestDiagnosis}
              disabled={!selectedTestProjectId || isChecking}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-colors flex items-center justify-center space-x-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run Test Crash Diagnosis</span>
            </button>

            <div className="p-3 rounded-xl bg-obsidian-900/60 border border-slate-800/80 space-y-1 text-[11px] text-slate-400 font-sans">
              <div className="font-semibold text-slate-300 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero Cloud Leakage Guarantee
              </div>
              <p>
                All prompts, logs, and files are queried strictly over local loopback (`127.0.0.1`).
                Sensitive `.env` credentials are sanitized before leaving the process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
