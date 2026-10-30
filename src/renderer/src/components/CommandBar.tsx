import React, { useState, useEffect, useRef } from 'react'
import {
  Terminal,
  Play,
  Square,
  Search,
  Network,
  FolderPlus,
  Settings,
  Code2,
  CornerDownLeft,
  X,
  Globe
} from 'lucide-react'
import { useLauncherStore } from '../stores/useLauncherStore'
import { useProcessStore } from '../stores/useProcessStore'
import { usePreviewStore } from '../stores/usePreviewStore'

export const CommandBar: React.FC = () => {
  const [inputVal, setInputVal] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    projects,
    activeProject,
    setActiveView,
    setSelectedProjectId,
    scanAndAddDirectory,
    openInVsCode,
    launchProfiles
  } = useLauncherStore()

  const {
    runningProcesses,
    startProcess,
    stopProcess,
    setIsTerminalOpen,
    clearLogs,
    activeProcessId
  } = useProcessStore()

  const {
    toggleOpen: togglePreview,
    setUrl: setPreviewUrl,
    setIsOpen: setIsPreviewOpen
  } = usePreviewStore()

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsFocused(true)
      } else if (e.key === 'Escape') {
        inputRef.current?.blur()
        setIsFocused(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  interface CommandItem {
    id: string
    title: string
    subtitle: string
    badge: string
    icon: React.ElementType
    action: () => void
  }

  const items: CommandItem[] = []

  // Global utility commands
  items.push({
    id: 'cmd_ports',
    title: 'ports',
    subtitle: 'Inspect local TCP ports & kill stuck port processes',
    badge: 'Utility',
    icon: Network,
    action: () => {
      setActiveView('ports')
      setInputVal('')
      inputRef.current?.blur()
    }
  })

  items.push({
    id: 'cmd_scan',
    title: 'scan / import',
    subtitle: 'Import a local project folder into Nexus',
    badge: 'System',
    icon: FolderPlus,
    action: () => {
      scanAndAddDirectory()
      setInputVal('')
      inputRef.current?.blur()
    }
  })

  items.push({
    id: 'cmd_settings',
    title: 'settings',
    subtitle: 'Configure launcher preferences, SQLite engine & telemetry',
    badge: 'System',
    icon: Settings,
    action: () => {
      setActiveView('settings')
      setInputVal('')
      inputRef.current?.blur()
    }
  })

  items.push({
    id: 'cmd_clear',
    title: 'clear / cls',
    subtitle: 'Clear active terminal console output',
    badge: 'Console',
    icon: Terminal,
    action: () => {
      if (activeProcessId) clearLogs(activeProcessId)
      setInputVal('')
      inputRef.current?.blur()
    }
  })

  items.push({
    id: 'cmd_preview',
    title: 'preview',
    subtitle: 'Toggle Antigravity live side preview drawer',
    badge: 'View',
    icon: Globe,
    action: () => {
      togglePreview()
      setInputVal('')
      inputRef.current?.blur()
    }
  })

  // Per-project dynamic commands: <project> launch, <project> stop, <project> code
  for (const p of projects) {
    const isRunning = runningProcesses.some((proc) => proc.projectId === p.id)
    const pProfiles = launchProfiles[p.id] || []
    const defProfile = pProfiles.find((lp) => lp.is_default === 1) || pProfiles[0]

    // 1. Launch command
    items.push({
      id: `launch_${p.id}`,
      title: `${p.name} launch`,
      subtitle: `Launch default profile for ${p.name}`,
      badge: 'Launch',
      icon: Play,
      action: () => {
        setSelectedProjectId(p.id)
        startProcess({
          projectId: p.id,
          profileId: defProfile?.id,
          scriptName: 'dev'
        })
        setIsTerminalOpen(true)
        setInputVal('')
        inputRef.current?.blur()
      }
    })

    // 2. Stop command
    if (isRunning) {
      items.push({
        id: `stop_${p.id}`,
        title: `${p.name} stop`,
        subtitle: `Terminate active process tree for ${p.name}`,
        badge: 'Kill',
        icon: Square,
        action: () => {
          const target = runningProcesses.find((proc) => proc.projectId === p.id)
          if (target) stopProcess(target.processId)
          setInputVal('')
          inputRef.current?.blur()
        }
      })
    }

    // 3. Code command
    items.push({
      id: `code_${p.id}`,
      title: `${p.name} code`,
      subtitle: `Open ${p.name} in VS Code`,
      badge: 'Editor',
      icon: Code2,
      action: () => {
        openInVsCode(p.path)
        setInputVal('')
        inputRef.current?.blur()
      }
    })

    // 4. Preview command
    items.push({
      id: `preview_${p.id}`,
      title: `${p.name} preview`,
      subtitle: `Open live side preview drawer for ${p.name}`,
      badge: 'Preview',
      icon: Globe,
      action: () => {
        const running = runningProcesses.find((proc) => proc.projectId === p.id)
        if (running?.detectedPort) {
          setPreviewUrl(`http://localhost:${running.detectedPort}`)
        }
        setIsPreviewOpen(true)
        setInputVal('')
        inputRef.current?.blur()
      }
    })
  }

  // Active project shorthand: typing "launch", "stop", or "code" when a project is active
  if (activeProject) {
    const isRunning = runningProcesses.some((proc) => proc.projectId === activeProject.id)
    items.unshift({
      id: 'active_launch',
      title: 'launch',
      subtitle: `Launch ${activeProject.name} (Active Project)`,
      badge: 'Active',
      icon: Play,
      action: () => {
        startProcess({ projectId: activeProject.id, scriptName: 'dev' })
        setIsTerminalOpen(true)
        setInputVal('')
        inputRef.current?.blur()
      }
    })

    if (isRunning) {
      items.unshift({
        id: 'active_stop',
        title: 'stop',
        subtitle: `Stop ${activeProject.name} (Active Project)`,
        badge: 'Kill',
        icon: Square,
        action: () => {
          const target = runningProcesses.find((proc) => proc.projectId === activeProject.id)
          if (target) stopProcess(target.processId)
          setInputVal('')
          inputRef.current?.blur()
        }
      })
    }
  }

  const query = inputVal.trim().toLowerCase()
  const filtered = query
    ? items.filter(
        (it) =>
          it.title.toLowerCase().includes(query) ||
          it.subtitle.toLowerCase().includes(query)
      )
    : items.slice(0, 8)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
      }
    }
  }

  return (
    <div className="h-14 px-4 bg-obsidian-900 border-b border-slate-800 flex items-center justify-between relative select-none z-30">
      {/* Interactive Command Prompt Container */}
      <div className="flex-1 max-w-2xl relative">
        <div
          className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-obsidian-850 border transition-all ${
            isFocused
              ? 'border-electric-indigo/80 ring-1 ring-electric-indigo/30 shadow-glow-indigo'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-1 text-electric-emerald font-mono font-bold text-xs shrink-0 select-none">
            <span>&gt;_</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value)
              setSelectedIndex(0)
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (e.g. <project> launch, <project> stop, <project> code, ports, or Ctrl+K)..."
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none"
          />

          {/* Quick Action Chips */}
          <div className="hidden sm:flex items-center space-x-1.5 shrink-0 text-[10px] font-mono">
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                setInputVal('launch')
                inputRef.current?.focus()
              }}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-electric-emerald border border-slate-700/60 transition-colors"
            >
              launch
            </button>

            <button
              onMouseDown={(e) => {
                e.preventDefault()
                setInputVal('stop')
                inputRef.current?.focus()
              }}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-electric-rose border border-slate-700/60 transition-colors"
            >
              stop
            </button>

            <button
              onMouseDown={(e) => {
                e.preventDefault()
                setInputVal('ports')
                inputRef.current?.focus()
              }}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-electric-cyan border border-slate-700/60 transition-colors"
            >
              ports
            </button>

            <div className="flex items-center space-x-0.5 text-slate-500 ml-1">
              <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9px]">
                Ctrl+K
              </kbd>
            </div>
          </div>
        </div>

        {/* Suggestions Popover */}
        {isFocused && filtered.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-obsidian-950 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/80">
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 font-mono">
              {filtered.map((item, index) => {
                const Icon = item.icon
                const isSelected = index === selectedIndex
                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      item.action()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-electric-indigo/20 text-slate-100 border border-electric-indigo/40'
                        : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-electric-indigoGlow' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {item.badge}
                      </span>
                      {isSelected && <CornerDownLeft className="w-3 h-3 text-electric-indigo" />}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-3 py-1.5 bg-obsidian-900 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Use ↑/↓ to navigate, Enter to trigger</span>
              <span>ESC to dismiss</span>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Drawer Quick Trigger */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsTerminalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-obsidian-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 text-xs font-mono transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-electric-indigo" />
          <span>Console Drawer</span>
        </button>
      </div>
    </div>
  )
}
