import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  X,
  Square,
  RotateCw,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  Plus,
  Play,
  Globe,
  Sparkles
} from 'lucide-react'
import { useProcessStore } from '../stores/useProcessStore'
import { useLauncherStore } from '../stores/useLauncherStore'
import { useAIStore } from '../stores/useAIStore'

const XTERM_THEME = {
  background: '#06070a',
  foreground: '#dce4f0',
  cursor: '#10b981',
  cursorAccent: '#06070a',
  selectionBackground: 'rgba(99, 102, 241, 0.35)',
  black: '#151b27',
  red: '#f43f5e',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#6366f1',
  magenta: '#d946ef',
  cyan: '#06b6d4',
  white: '#f1f5f9',
  brightBlack: '#3e4b66',
  brightRed: '#fb7185',
  brightGreen: '#34d399',
  brightYellow: '#fbbf24',
  brightBlue: '#818cf8',
  brightMagenta: '#e879f9',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff'
}

export const TerminalDrawer: React.FC = () => {
  const {
    isTerminalOpen,
    setIsTerminalOpen,
    drawerHeight,
    setDrawerHeight,
    runningProcesses,
    activeProcessId,
    setActiveProcessId,
    logsByProcessId,
    stopProcess,
    restartProcess,
    clearLogs,
    sendTerminalInput,
    spawnShell
  } = useProcessStore()

  const { activeProject } = useLauncherStore()
  const { diagnoseCrash } = useAIStore()

  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermInstanceRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const renderedLogsCountRef = useRef<Record<string, number>>({})

  const [isFullscreen, setIsFullscreen] = useState(false)

  const activeProcess =
    runningProcesses.find((p) => p.processId === activeProcessId) || runningProcesses[0]

  // Initialize or re-attach xterm instance
  useEffect(() => {
    if (!isTerminalOpen || !terminalRef.current) return

    if (!xtermInstanceRef.current) {
      const term = new XTerm({
        theme: XTERM_THEME,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        fontSize: 12,
        lineHeight: 1.25,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 5000,
        convertEol: true
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      term.open(terminalRef.current)
      fitAddon.fit()

      // Handle interactive terminal user keystroke input
      term.onData((data) => {
        if (activeProcess?.processId) {
          sendTerminalInput(activeProcess.processId, data)
        }
      })

      xtermInstanceRef.current = term
      fitAddonRef.current = fitAddon
    } else {
      setTimeout(() => fitAddonRef.current?.fit(), 50)
    }

    const handleResize = () => {
      fitAddonRef.current?.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [isTerminalOpen, activeProcess?.processId])

  // Switch terminal tabs & render log buffer
  useEffect(() => {
    const term = xtermInstanceRef.current
    if (!term || !activeProcess) return

    term.clear()
    renderedLogsCountRef.current[activeProcess.processId] = 0

    const logs = logsByProcessId[activeProcess.processId] || []
    for (const log of logs) {
      term.write(log.message.replace(/\r?\n/g, '\r\n'))
    }
    renderedLogsCountRef.current[activeProcess.processId] = logs.length
    fitAddonRef.current?.fit()
  }, [activeProcess?.processId])

  // Stream new logs incrementally into active terminal
  useEffect(() => {
    const term = xtermInstanceRef.current
    if (!term || !activeProcess) return

    const logs = logsByProcessId[activeProcess.processId] || []
    const rendered = renderedLogsCountRef.current[activeProcess.processId] || 0

    if (logs.length > rendered) {
      for (let i = rendered; i < logs.length; i++) {
        term.write(logs[i].message.replace(/\r?\n/g, '\r\n'))
      }
      renderedLogsCountRef.current[activeProcess.processId] = logs.length
    }
  }, [logsByProcessId, activeProcess?.processId])

  if (!isTerminalOpen) return null

  const handleCopyLogs = () => {
    if (!activeProcess) return
    const logs = logsByProcessId[activeProcess.processId] || []
    const text = logs.map((l) => l.message).join('\n')
    navigator.clipboard.writeText(text)
  }

  const handleClear = () => {
    if (!activeProcess) return
    xtermInstanceRef.current?.clear()
    clearLogs(activeProcess.processId)
    renderedLogsCountRef.current[activeProcess.processId] = 0
  }

  const handleSpawnPowerShell = () => {
    spawnShell(activeProject?.id)
  }

  const toggleHeight = () => {
    if (drawerHeight === 240) setDrawerHeight(360)
    else if (drawerHeight === 360) setDrawerHeight(520)
    else setDrawerHeight(240)
  }

  return (
    <div
      style={{ height: isFullscreen ? 'calc(100vh - 28px)' : `${drawerHeight}px` }}
      className="bg-obsidian-950 border-t border-slate-800 flex flex-col select-none shrink-0 z-40 transition-all duration-150 relative shadow-2xl"
    >
      {/* Drawer Header & Terminal Tabs */}
      <div className="h-10 px-3 bg-obsidian-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        {/* Left: Tab items */}
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[65%]">
          <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-xs font-bold mr-2 shrink-0">
            <TerminalIcon className="w-3.5 h-3.5 text-electric-indigo" />
            <span>Terminal</span>
          </div>

          {runningProcesses.map((proc) => {
            const isSelected = activeProcess?.processId === proc.processId
            return (
              <button
                key={proc.processId}
                onClick={() => setActiveProcessId(proc.processId)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-mono transition-all shrink-0 ${
                  isSelected
                    ? 'bg-obsidian-950 text-electric-emerald border border-slate-700 shadow-sm font-bold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    proc.status === 'running'
                      ? 'bg-electric-emerald animate-pulse'
                      : proc.status === 'crashed'
                      ? 'bg-electric-rose'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="truncate max-w-[130px]">{proc.projectName}</span>
                {proc.detectedPort && (
                  <span className="text-[10px] text-electric-cyan font-bold">
                    :{proc.detectedPort}
                  </span>
                )}
              </button>
            )
          })}

          {/* Spawn PowerShell Tab Button */}
          <button
            onClick={handleSpawnPowerShell}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 bg-obsidian-850 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0"
            title="Spawn interactive PowerShell terminal"
          >
            <Plus className="w-3 h-3 text-electric-indigo" />
            <span>PowerShell</span>
          </button>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          {activeProcess && (
            <>
              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  activeProcess.status === 'running'
                    ? 'bg-electric-emerald/15 text-electric-emerald border-electric-emerald/30'
                    : activeProcess.status === 'crashed'
                    ? 'bg-electric-rose/15 text-electric-rose border-electric-rose/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {activeProcess.status.toUpperCase()}
                {activeProcess.exitCode !== null && activeProcess.exitCode !== 0
                  ? ` (${activeProcess.exitCode})`
                  : ''}
              </span>

              {/* One-Click Crash Diagnostics Button */}
              {(activeProcess.status === 'crashed' ||
                (activeProcess.exitCode !== null && activeProcess.exitCode !== 0)) && (
                <button
                  onClick={() => {
                    const logs = logsByProcessId[activeProcess.processId] || []
                    const logText = logs.map((l) => l.message).join('')
                    diagnoseCrash({
                      projectId: activeProcess.projectId,
                      processId: activeProcess.processId,
                      exitCode: activeProcess.exitCode || 1,
                      recentLogs: logText
                    })
                  }}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold transition-all shadow-sm animate-pulse hover:animate-none"
                  title="Diagnose Failure with Local AI"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Diagnose Failure</span>
                </button>
              )}

              {/* PID Badge */}
              {activeProcess.pid && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] border border-slate-700">
                  PID: {activeProcess.pid}
                </span>
              )}

              {/* Open Browser if port detected */}
              {activeProcess.detectedPort && (
                <button
                  onClick={() =>
                    window.nexus.system.openPath(`http://localhost:${activeProcess.detectedPort}`)
                  }
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-electric-cyan/15 text-electric-cyan border border-electric-cyan/30 hover:bg-electric-cyan/25 font-bold"
                  title="Open live web app in browser"
                >
                  <Globe className="w-3 h-3" />
                  <span>:{activeProcess.detectedPort}</span>
                </button>
              )}

              {/* Restart */}
              <button
                onClick={() => restartProcess(activeProcess.processId)}
                title="Restart process"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-electric-cyan transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Stop / Kill via taskkill /T /F */}
              <button
                onClick={() => stopProcess(activeProcess.processId)}
                title="Force kill process tree (taskkill /T /F)"
                className="p-1.5 rounded hover:bg-electric-rose/20 text-slate-400 hover:text-electric-rose transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-800" />
            </>
          )}

          {/* Clear Console */}
          <button
            onClick={handleClear}
            title="Clear Terminal Output"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Copy Output */}
          <button
            onClick={handleCopyLogs}
            title="Copy Terminal Logs"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Height Resize Presets */}
          <button
            onClick={toggleHeight}
            title="Resize Drawer Height"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
          >
            {drawerHeight > 300 ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen)
              setTimeout(() => fitAddonRef.current?.fit(), 100)
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal'}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Drawer */}
          <button
            onClick={() => setIsTerminalOpen(false)}
            title="Collapse Drawer"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Xterm.js Container */}
      <div
        ref={terminalRef}
        className="flex-1 w-full h-full p-2 bg-[#06070a] overflow-hidden select-text"
      />
    </div>
  )
}
