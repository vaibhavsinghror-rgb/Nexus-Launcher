import React, { useState, useEffect } from 'react'
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Code2
} from 'lucide-react'
import type { PingEndpointResult } from '../../../shared/ipc-types'

interface ApiInspectorProps {
  baseUrl: string
}

interface RequestHistoryItem {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
  endpoint: string
  status: number
  latencyMs: number
  timestamp: number
}

const COMMON_PRESETS = ['/', '/health', '/api', '/api/v1', '/docs', '/metrics', '/status']

export const ApiInspector: React.FC<ApiInspectorProps> = ({ baseUrl }) => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'>('GET')
  const [endpoint, setEndpoint] = useState<string>('/')
  const [requestBody, setRequestBody] = useState<string>('{\n  \n}')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [result, setResult] = useState<PingEndpointResult | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [history, setHistory] = useState<RequestHistoryItem[]>([])
  const [activeTab, setActiveTab] = useState<'response' | 'headers' | 'history'>('response')

  // Derive absolute target URL
  const getFullUrl = (ep: string) => {
    try {
      const base = baseUrl.replace(/\/+$/, '')
      const cleanEp = ep.startsWith('/') ? ep : '/' + ep
      return `${base}${cleanEp}`
    } catch {
      return baseUrl
    }
  }

  const handleSend = async () => {
    if (isLoading) return
    setIsLoading(true)

    const fullUrl = getFullUrl(endpoint)
    try {
      const res = await window.nexus.process.pingEndpoint({
        url: fullUrl,
        method,
        body: ['GET', 'HEAD'].includes(method) ? undefined : requestBody,
        timeoutMs: 12000
      })
      setResult(res)

      // Add to session history
      const historyItem: RequestHistoryItem = {
        id: 'hist_' + Date.now(),
        method,
        endpoint,
        status: res.status,
        latencyMs: res.latencyMs,
        timestamp: Date.now()
      }
      setHistory((prev) => [historyItem, ...prev.slice(0, 19)])
    } catch (err: any) {
      setResult({
        status: 0,
        statusText: 'Client Error',
        latencyMs: 0,
        headers: {},
        data: '',
        isJson: false,
        error: err?.message || 'Failed to execute ping'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result?.data) return
    navigator.clipboard.writeText(result.data)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Keyboard shortcut Ctrl+Enter to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          {status} OK
        </span>
      )
    }
    if (status >= 300 && status < 400) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {status} REDIRECT
        </span>
      )
    }
    if (status >= 400 && status < 500) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" />
          {status} ERROR
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3 h-3" />
        {status === 0 ? 'CONNECTION FAILED' : `${status} SERVER ERROR`}
      </span>
    )
  }

  // Format JSON nicely if valid
  const getFormattedResponse = () => {
    if (!result) return ''
    if (result.error) return result.error
    if (!result.data) return 'No content returned.'
    if (result.isJson) {
      try {
        const parsed = JSON.parse(result.data)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return result.data
      }
    }
    return result.data
  }

  return (
    <div className="flex flex-col h-full bg-obsidian-950 text-slate-200 select-text font-sans">
      {/* Target Base URL Header */}
      <div className="p-3 border-b border-slate-800/80 bg-obsidian-900/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            API & Health Inspector
          </span>
          <span className="text-[11px] font-mono text-slate-500">Ctrl+Enter to Ping</span>
        </div>

        {/* Quick Endpoint Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mr-1">
            Presets:
          </span>
          {COMMON_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setEndpoint(p)
                if (p === '/docs') setMethod('GET')
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap transition-colors ${
                endpoint === p
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-obsidian-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Request Builder Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-obsidian-900/30 space-y-2">
        <div className="flex items-center gap-2">
          {/* Method Selector */}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wide outline-none border transition-colors ${
              method === 'GET'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : method === 'POST'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : method === 'PUT'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="HEAD">HEAD</option>
          </select>

          {/* Endpoint Input */}
          <div className="flex-1 flex items-center bg-obsidian-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-indigo-500/50">
            <span className="px-2.5 text-xs font-mono text-slate-500 select-none bg-obsidian-900/80 border-r border-slate-800 py-1.5">
              {baseUrl.replace(/\/+$/, '')}
            </span>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="/health or /api/v1/..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs font-mono text-slate-200 outline-none"
            />
          </div>

          {/* Send Ping Button */}
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send</span>
          </button>
        </div>

        {/* JSON Request Body (if POST/PUT/PATCH) */}
        {['POST', 'PUT', 'PATCH'].includes(method) && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                JSON Request Body
              </span>
            </div>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full bg-obsidian-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500/50 resize-y"
            />
          </div>
        )}
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between px-3 border-b border-slate-800 bg-obsidian-900/40">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('response')}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'response'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Response
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'headers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Headers
            {result && Object.keys(result.headers).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-obsidian-800 text-slate-400">
                {Object.keys(result.headers).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            History
            {history.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-obsidian-800 text-slate-400">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Status & Latency Badges */}
        {result && activeTab === 'response' && (
          <div className="flex items-center gap-2">
            {getStatusBadge(result.status)}
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              <span
                className={
                  result.latencyMs < 100
                    ? 'text-emerald-400 font-semibold'
                    : result.latencyMs < 500
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }
              >
                {result.latencyMs} ms
              </span>
            </span>
            <button
              onClick={handleCopy}
              title="Copy Response"
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {activeTab === 'response' && (
          <div>
            {result ? (
              <pre className="text-slate-300 leading-relaxed whitespace-pre-wrap break-all select-text font-mono">
                {getFormattedResponse()}
              </pre>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 select-none">
                <Code2 className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                <p>No request sent yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Choose an endpoint and click Send or press Ctrl+Enter.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div>
            {result && Object.keys(result.headers).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(result.headers).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-start gap-2 py-1 border-b border-slate-800/60 font-mono text-xs"
                  >
                    <span className="text-indigo-400 font-medium min-w-[140px] break-all">{k}:</span>
                    <span className="text-slate-300 break-all flex-1">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500">
                <p>No response headers available.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-1.5">
            {history.length > 0 ? (
              history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    setMethod(h.method)
                    setEndpoint(h.endpoint)
                    setActiveTab('response')
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-obsidian-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        h.method === 'GET'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}
                    >
                      {h.method}
                    </span>
                    <span className="text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {h.endpoint}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    {getStatusBadge(h.status)}
                    <span className="text-slate-500">{h.latencyMs}ms</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500">
                <p>No request history yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
