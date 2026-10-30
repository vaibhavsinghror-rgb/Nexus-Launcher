import React, { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { CommandBar } from './components/CommandBar'
import { TerminalDrawer } from './components/TerminalDrawer'
import { LivePreviewDrawer } from './components/LivePreviewDrawer'
import { CrashDiagnosticModal } from './components/CrashDiagnosticModal'
import { PatchReviewModal } from './features/PatchReview/PatchReviewModal'
import { TelemetryFooter } from './components/TelemetryFooter'
import { DashboardView } from './views/DashboardView'
import { ProjectsView } from './views/ProjectsView'
import { ProjectDetailView } from './views/ProjectDetailView'
import { ProcessesView } from './views/ProcessesView'
import { PortManagerView } from './views/PortManagerView'
import { AIAssistantView } from './views/AIAssistantView'
import { SettingsView } from './views/SettingsView'
import { useLauncherStore } from './stores/useLauncherStore'
import { useProcessStore } from './stores/useProcessStore'
import { usePreviewStore } from './stores/usePreviewStore'

export const App: React.FC = () => {
  const { activeView, projects, loadProjects } = useLauncherStore()
  const { loadRunningProcesses, initProcessListeners } = useProcessStore()
  const { initServerReadyListener } = usePreviewStore()

  useEffect(() => {
    // Initial data bootstrap from SQLite
    loadProjects()
    loadRunningProcesses()

    // Real-time process logging & state change IPC listener
    const cleanupProcessListeners = initProcessListeners()

    // Antigravity auto-port server ready listener
    const cleanupServerReady = initServerReadyListener((projectId) => {
      const p = projects.find((item) => item.id === projectId)
      return p?.name
    })

    return () => {
      cleanupProcessListeners()
      cleanupServerReady()
    }
  }, [projects])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian-950 text-slate-100 font-sans select-none antialiased">
      {/* Top Global Command Input Bar */}
      <CommandBar />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Collapsible Left Sidebar */}
        <Sidebar />

        {/* Dynamic Main Workspace Container */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-obsidian-900">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'projects' && <ProjectsView />}
          {activeView === 'project-detail' && <ProjectDetailView />}
          {activeView === 'processes' && <ProcessesView />}
          {activeView === 'ports' && <PortManagerView />}
          {activeView === 'ai' && <AIAssistantView />}
          {activeView === 'settings' && <SettingsView />}
        </main>

        {/* Antigravity-Style Live Preview Side Window Drawer */}
        <LivePreviewDrawer />
      </div>

      {/* Real-time xterm.js Bottom Drawer */}
      <TerminalDrawer />

      {/* Bottom Hardware Telemetry Footer (Real CPU / RAM / GPU / SQLite WAL) */}
      <TelemetryFooter />

      {/* Local-First AI Crash Diagnostic Modal */}
      <CrashDiagnosticModal />

      {/* Human-in-the-Loop Patch Review & Diff Modal */}
      <PatchReviewModal />
    </div>
  )
}
