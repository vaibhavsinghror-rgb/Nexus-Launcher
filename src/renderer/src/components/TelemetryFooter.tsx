import React, { useEffect } from 'react'
import {
  Activity,
  HardDrive,
  Cpu,
  Database,
  Terminal,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { useTelemetryStore } from '../stores/useTelemetryStore'
import { useProcessStore } from '../stores/useProcessStore'
import { useLauncherStore } from '../stores/useLauncherStore'
import { usePreviewStore } from '../stores/usePreviewStore'

export const TelemetryFooter: React.FC = () => {
  const { telemetry, dbHealth, startPolling } = useTelemetryStore()
  const { runningProcesses, isTerminalOpen, setIsTerminalOpen } = useProcessStore()
  const { isOpen: isPreviewOpen, port: previewPort, toggleOpen: togglePreview } = usePreviewStore()
  const { setActiveView } = useLauncherStore()

  useEffect(() => {
    // Poll every 3000ms as strictly required by SPEC
    const cleanup = startPolling(3000)
    return () => {
      cleanup()
    }
  }, [])

  const cpuPercent = telemetry ? telemetry.cpu.usagePercent : 0
  const ramUsedGb = telemetry ? telemetry.ram.usedGb : 0
  const ramTotalGb = telemetry ? telemetry.ram.totalGb : 0
  const ramPercent = telemetry ? telemetry.ram.usagePercent : 0

  const gpu = telemetry?.gpu
  const vramUsedGb = gpu?.vramUsedMb ? (gpu.vramUsedMb / 1024).toFixed(1) : null
  const vramTotalGb = gpu?.vramTotalMb ? (gpu.vramTotalMb / 1024).toFixed(1) : null

  // CPU color threshold
  let cpuColor = 'text-electric-emerald'
  if (cpuPercent > 80) cpuColor = 'text-electric-rose'
  else if (cpuPercent > 50) cpuColor = 'text-electric-amber'

  // RAM color threshold
  let ramColor = 'text-electric-indigo'
  if (ramPercent > 85) ramColor = 'text-electric-rose'
  else if (ramPercent > 70) ramColor = 'text-electric-amber'

  return (
    <footer className="h-7 bg-obsidian-950 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] font-mono select-none shrink-0 z-30">
      {/* Left side: System & DB Status */}
      <div className="flex items-center space-x-3.5">
        {/* Active Processes Indicator */}
        <button
          onClick={() => setActiveView('processes')}
          className={`flex items-center space-x-1.5 transition-colors ${
            runningProcesses.length > 0
              ? 'text-electric-emerald font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Click to view running processes"
        >
          <Activity
            className={`w-3 h-3 ${
              runningProcesses.length > 0 ? 'animate-pulse text-electric-emerald' : ''
            }`}
          />
          <span>Processes: {runningProcesses.length}</span>
        </button>

        <div className="h-3 w-px bg-slate-800" />

        {/* Database WAL Status */}
        <button
          onClick={() => setActiveView('settings')}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title={`SQLite WAL engine active: ${dbHealth?.dbPath || 'nexus.db'}`}
        >
          <Database className="w-3 h-3 text-electric-indigo" />
          <span>
            SQLite: {dbHealth?.walModeActive ? 'WAL' : 'Connected'} (v{dbHealth?.currentVersion || 1})
          </span>
        </button>

        <div className="h-3 w-px bg-slate-800" />

        {/* Live Preview Side Drawer Toggle */}
        <button
          onClick={togglePreview}
          className={`flex items-center space-x-1.5 transition-colors ${
            isPreviewOpen
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Antigravity Live Preview Drawer"
        >
          <Globe className="w-3 h-3 text-indigo-400" />
          <span>Preview {previewPort ? `(:${previewPort})` : ''}</span>
        </button>

        <div className="h-3 w-px bg-slate-800" />

        {/* Bottom Terminal Drawer Toggle */}
        <button
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          className={`flex items-center space-x-1.5 transition-colors ${
            isTerminalOpen
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Bottom Terminal Drawer"
        >
          <Terminal className="w-3 h-3 text-emerald-400" />
          <span>Terminal</span>
        </button>
      </div>

      {/* Right side: Hardware Telemetry Metrics (CPU, RAM, GPU/VRAM) */}
      <div className="flex items-center space-x-4">
        {/* Windows CPU Usage */}
        <div
          className="flex items-center space-x-1.5"
          title={`CPU: ${telemetry?.cpu.model || 'Processor'} (${telemetry?.cpu.cores || 0} Cores)`}
        >
          <Cpu className={`w-3 h-3 ${cpuColor}`} />
          <span className="text-slate-400">CPU:</span>
          <span className={`font-bold ${cpuColor}`}>{cpuPercent}%</span>
          {/* Visual Mini Progress Bar */}
          <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden md:block">
            <div
              className="h-full bg-electric-emerald transition-all duration-500"
              style={{ width: `${cpuPercent}%` }}
            />
          </div>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        {/* System RAM Usage */}
        <div
          className="flex items-center space-x-1.5"
          title={`Used RAM: ${ramUsedGb} GB of ${ramTotalGb} GB (${ramPercent}%)`}
        >
          <HardDrive className={`w-3 h-3 ${ramColor}`} />
          <span className="text-slate-400">RAM:</span>
          <span className="text-slate-200">
            {ramUsedGb}/{ramTotalGb} GB
          </span>
          <span className={`font-bold ${ramColor}`}>({ramPercent}%)</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        {/* GPU & VRAM (NVIDIA with safe fallback) */}
        {gpu?.hasNvidiaGpu ? (
          <div
            className="flex items-center space-x-1.5"
            title={`${gpu.gpuName || 'NVIDIA GPU'} | VRAM: ${vramUsedGb}/${vramTotalGb} GB (${gpu.vramPercent}%)`}
          >
            <Zap className="w-3 h-3 text-electric-cyan" />
            <span className="text-slate-400">GPU:</span>
            <span className="text-electric-cyan font-bold">
              {gpu.gpuUtilization !== null ? `${gpu.gpuUtilization}%` : '0%'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">VRAM:</span>
            <span className="text-slate-200">
              {vramUsedGb}/{vramTotalGb} GB
            </span>
            <span className="text-electric-cyan font-bold">({gpu.vramPercent}%)</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-slate-500" title="No NVIDIA GPU detected">
            <Zap className="w-3 h-3 text-slate-600" />
            <span>GPU: Standard</span>
          </div>
        )}
      </div>
    </footer>
  )
}
