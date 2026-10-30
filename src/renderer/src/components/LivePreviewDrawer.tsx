import React, { useState, useEffect, useRef } from 'react'
import {
  Globe,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  X,
  Code2,
  FileCode,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
  Zap,
  Radio
} from 'lucide-react'
import { usePreviewStore } from '../stores/usePreviewStore'
import { ApiInspector } from './ApiInspector'

export const LivePreviewDrawer: React.FC = () => {
  const {
    isOpen,
    width,
    url,
    port,
    projectName,
    mode,
    viewport,
    refreshKey,
    setIsOpen,
    setWidth,
    setUrl,
    setMode,
    setViewport,
    refresh
  } = usePreviewStore()

  const [inputUrl, setInputUrl] = useState<string>(url)
  const [isResizing, setIsResizing] = useState<boolean>(false)
  const [iframeError, setIframeError] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Keep input bar in sync with store URL
  useEffect(() => {
    setInputUrl(url)
    setIframeError(false)
  }, [url, refreshKey])

  // Resizing logic on the left edge of the side drawer
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let target = inputUrl.trim()
    if (!target) return
    if (!/^https?:\/\//i.test(target)) {
      if (port) {
        target = `http://localhost:${port}${target.startsWith('/') ? target : '/' + target}`
      } else {
        target = `http://${target}`
      }
    }
    setUrl(target)
    refresh()
  }

  const handleQuickNavigate = (path: string) => {
    try {
      const parsed = new URL(url)
      parsed.pathname = path
      const newUrl = parsed.toString()
      setUrl(newUrl)
      setInputUrl(newUrl)
      refresh()
    } catch {
      if (port) {
        const newUrl = `http://localhost:${port}${path}`
        setUrl(newUrl)
        setInputUrl(newUrl)
        refresh()
      }
    }
  }

  const handleOpenExternal = async () => {
    if (!url) return
    try {
      await window.nexus.system.openExternalUrl(url)
    } catch (err) {
      console.error('Failed to open external URL:', err)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      style={{ width: `${width}px` }}
      className="relative flex flex-col h-full bg-obsidian-950 border-l border-slate-800 shadow-2xl z-20 flex-shrink-0 animate-in slide-in-from-right duration-200"
    >
      {/* Left Border Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize hover:bg-indigo-500/50 transition-colors z-30 ${
          isResizing ? 'bg-indigo-500' : 'bg-transparent'
        }`}
      />

      {/* Top Header & Control Bar */}
      <div className="flex flex-col border-b border-slate-800 bg-obsidian-900/90 select-none">
        {/* Title & Mode Switcher Row */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE PREVIEW
            </span>
            {port && (
              <span className="text-xs font-mono text-slate-400 bg-obsidian-800 px-2 py-0.5 rounded border border-slate-800">
                :{port}
              </span>
            )}
            {projectName && (
              <span className="text-xs font-medium text-slate-300 truncate max-w-[150px]">
                {projectName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mode Switcher: Web View vs API Inspector */}
            <div className="flex items-center bg-obsidian-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setMode('browser')}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  mode === 'browser'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Web / Swagger Live Browser"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web</span>
              </button>
              <button
                onClick={() => setMode('api-inspector')}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  mode === 'api-inspector'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="API Ping & Health Check Inspector"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>API Inspector</span>
              </button>
            </div>

            {/* Close Side Drawer */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors ml-1"
              title="Close Live Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mini Browser Bar (Only shown in Browser Mode) */}
        {mode === 'browser' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-obsidian-900/60">
            {/* Reload Button */}
            <button
              onClick={() => {
                setIsLoading(true)
                refresh()
                setTimeout(() => setIsLoading(false), 500)
              }}
              title="Reload Page"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* URL Input Form */}
            <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center">
              <div className="flex-1 flex items-center bg-obsidian-950 border border-slate-800 rounded-lg px-2.5 py-1 focus-within:border-indigo-500/60 transition-colors">
                <Globe className="w-3.5 h-3.5 text-slate-500 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="http://localhost:..."
                  className="w-full bg-transparent text-xs font-mono text-slate-200 outline-none select-text"
                />
              </div>
            </form>

            {/* Quick Switch Pills */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleQuickNavigate('/docs')}
                className="px-2 py-1 rounded text-[11px] font-mono bg-obsidian-800 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 transition-colors"
                title="FastAPI / Swagger Documentation UI"
              >
                /docs
              </button>
              <button
                onClick={() => handleQuickNavigate('/')}
                className="px-2 py-1 rounded text-[11px] font-mono bg-obsidian-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                title="Root App"
              >
                /
              </button>
            </div>

            {/* Viewport Toggle (Desktop vs Mobile) */}
            <div className="flex items-center bg-obsidian-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1 rounded transition-colors ${
                  viewport === 'desktop'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Desktop Viewport"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={`p-1 rounded transition-colors ${
                  viewport === 'mobile'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Mobile Viewport (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Open in External Browser */}
            <button
              onClick={handleOpenExternal}
              title="Open in System Default Browser"
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Drawer Body */}
      <div className="flex-1 relative overflow-hidden bg-obsidian-950 flex flex-col">
        {mode === 'browser' ? (
          <div
            className={`flex-1 w-full h-full flex items-center justify-center overflow-auto ${
              viewport === 'mobile' ? 'p-4 bg-obsidian-900/40' : ''
            }`}
          >
            {/* If Mobile Viewport, wrap inside a phone container */}
            <div
              className={`h-full transition-all duration-200 flex flex-col ${
                viewport === 'mobile'
                  ? 'w-[375px] max-h-[720px] rounded-2xl border-4 border-slate-700 bg-obsidian-950 shadow-2xl overflow-hidden'
                  : 'w-full'
              }`}
            >
              {/* Mobile Phone Top Notch Simulation */}
              {viewport === 'mobile' && (
                <div className="h-4 bg-slate-800 flex items-center justify-center select-none">
                  <div className="w-12 h-1 bg-slate-600 rounded-full" />
                </div>
              )}

              {/* Sandboxed Live Web View Frame */}
              <iframe
                key={refreshKey}
                ref={iframeRef}
                src={url}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                className="w-full flex-1 border-0 bg-white"
                onLoad={() => {
                  setIsLoading(false)
                  setIframeError(false)
                }}
                onError={() => setIframeError(true)}
              />
            </div>
          </div>
        ) : (
          <ApiInspector baseUrl={url} />
        )}
      </div>
    </div>
  )
}
