import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  FolderOpen,
  Code2,
  GitBranch,
  KeyRound,
  FileCode,
  FolderTree,
  Terminal,
  FileText,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  Settings2,
  Star,
  Sparkles
} from 'lucide-react'
import type {
  ProjectRecord,
  LaunchProfileRecord,
  ProjectConfigFile,
  FileTreeNode,
  EnvVariable
} from '../../../shared/ipc-types'
import { useLauncherStore } from '../stores/useLauncherStore'
import { useProcessStore } from '../stores/useProcessStore'
import { useAIStore } from '../stores/useAIStore'

export const ProjectDetailView: React.FC = () => {
  const {
    activeProject,
    setActiveView,
    launchProfiles,
    activeProjectConfigs,
    activeProjectTree,
    activeProjectEnvVars,
    projectGitStatuses,
    updateProjectBrief,
    openInVsCode,
    openInExplorer,
    toggleFavorite,
    loadLaunchProfiles,
    loadProjectDetailData
  } = useLauncherStore()

  const { runningProcesses, startProcess, stopProcess, restartProcess } = useProcessStore()
  const { diagnoseCrash } = useAIStore()

  // Tab State: 'overview' | 'schema' | 'tree' | 'profiles-env'
  const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'tree' | 'profiles-env'>('overview')

  // Overview / Brief State
  const [briefInput, setBriefInput] = useState('')
  const [descInput, setDescInput] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [briefSavedMsg, setBriefSavedMsg] = useState('')

  // Schema & Config Viewer State
  const [selectedConfigFile, setSelectedConfigFile] = useState<ProjectConfigFile | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [isLoadingFile, setIsLoadingFile] = useState(false)

  // Launch Profiles & Env State
  const [showAddProfileModal, setShowAddProfileModal] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileCommand, setNewProfileCommand] = useState('npm.cmd')
  const [newProfileArgs, setNewProfileArgs] = useState('run dev')
  const [newProfilePreview, setNewProfilePreview] = useState(true)
  const [newProfileDefault, setNewProfileDefault] = useState(false)

  // Compound Stacks State
  const [selectedCompoundIds, setSelectedCompoundIds] = useState<string[]>([])

  // .env Editor State
  const [envVarsMap, setEnvVarsMap] = useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = useState(false)
  const [newEnvKey, setNewEnvKey] = useState('')
  const [newEnvVal, setNewEnvVal] = useState('')
  const [envSaveMsg, setEnvSaveMsg] = useState('')

  useEffect(() => {
    if (activeProject) {
      setBriefInput(activeProject.brief || '')
      setDescInput(activeProject.description || '')
      try {
        const parsedTags: string[] = JSON.parse(activeProject.tags_json || '[]')
        setTagsInput(parsedTags.join(', '))
      } catch {
        setTagsInput('')
      }
    }
  }, [activeProject])

  useEffect(() => {
    if (activeProjectConfigs.length > 0 && !selectedConfigFile) {
      setSelectedConfigFile(activeProjectConfigs[0])
    }
  }, [activeProjectConfigs, selectedConfigFile])

  useEffect(() => {
    if (selectedConfigFile) {
      setIsLoadingFile(true)
      window.nexus.config
        .readFile(selectedConfigFile.path)
        .then((content) => {
          setFileContent(content)
        })
        .catch((err) => {
          setFileContent(`/* Error reading file: ${err.message} */`)
        })
        .finally(() => {
          setIsLoadingFile(false)
        })
    }
  }, [selectedConfigFile])

  useEffect(() => {
    const map: Record<string, string> = {}
    for (const item of activeProjectEnvVars) {
      map[item.key] = item.value
    }
    setEnvVarsMap(map)
  }, [activeProjectEnvVars])

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 font-mono text-xs bg-obsidian-900">
        <span>No project selected. Return to Dashboard.</span>
        <button
          onClick={() => setActiveView('dashboard')}
          className="mt-3 px-3 py-1.5 rounded bg-slate-800 text-slate-300"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  const runningProc = runningProcesses.find((p) => p.projectId === activeProject.id)
  const isRunning = Boolean(runningProc)
  const git = projectGitStatuses[activeProject.id]
  const profiles = launchProfiles[activeProject.id] || []
  const defaultProfile = profiles.find((p) => p.is_default === 1) || profiles[0]

  const handleSaveBrief = async () => {
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    await updateProjectBrief(activeProject.id, briefInput, descInput, parsedTags)
    setBriefSavedMsg('Brief and tags saved to SQLite!')
    setTimeout(() => setBriefSavedMsg(''), 2500)
  }

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProfileName || !newProfileCommand) return

    const args = newProfileArgs
      .split(' ')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    await window.nexus.launchProfiles.create({
      project_id: activeProject.id,
      name: newProfileName,
      command: newProfileCommand,
      args,
      auto_open_preview: newProfilePreview,
      is_default: newProfileDefault
    })

    await loadLaunchProfiles(activeProject.id)
    setShowAddProfileModal(false)
    setNewProfileName('')
  }

  const handleDeleteProfile = async (profileId: string) => {
    await window.nexus.launchProfiles.delete(profileId)
    await loadLaunchProfiles(activeProject.id)
  }

  const handleLaunchCompound = async () => {
    if (selectedCompoundIds.length === 0) {
      alert('Select at least one launch profile to trigger compound stack.')
      return
    }
    await window.nexus.launchProfiles.launchCompound(selectedCompoundIds)
    setActiveView('processes')
  }

  const handleSaveEnvVars = async () => {
    const ok = await window.nexus.env.saveVars(activeProject.path, '.env', envVarsMap)
    if (ok) {
      setEnvSaveMsg('Updated .env saved safely to disk!')
      setTimeout(() => setEnvSaveMsg(''), 2500)
      loadProjectDetailData(activeProject.id)
    } else {
      alert('Failed to save .env file.')
    }
  }

  // Recursive Tree Component
  const TreeNodeRenderer: React.FC<{ node: FileTreeNode; level?: number }> = ({ node, level = 0 }) => {
    const [expanded, setExpanded] = useState(level < 2)

    return (
      <div className="text-xs font-mono">
        <div
          onClick={() => {
            if (node.isDirectory) {
              setExpanded(!expanded)
            } else {
              // Clicked file -> show in viewer
              setIsLoadingFile(true)
              window.nexus.config
                .readFile(node.path)
                .then((c) => {
                  setFileContent(c)
                  setSelectedConfigFile({
                    name: node.relativePath,
                    path: node.path,
                    category: 'config',
                    language: node.extension?.slice(1) || 'plaintext',
                    sizeBytes: node.size || 0
                  })
                  setActiveTab('schema')
                })
                .finally(() => setIsLoadingFile(false))
            }
          }}
          className={`flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-slate-800/60 cursor-pointer text-slate-300 hover:text-slate-100 transition-colors`}
          style={{ paddingLeft: `${level * 14 + 8}px` }}
        >
          {node.isDirectory ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )
          ) : (
            <FileCode className="w-3.5 h-3.5 text-electric-indigoGlow shrink-0" />
          )}

          <span className="truncate">{node.name}</span>
          {!node.isDirectory && node.size !== undefined && (
            <span className="text-[10px] text-slate-600 ml-auto">
              {(node.size / 1024).toFixed(0)} KB
            </span>
          )}
        </div>

        {node.isDirectory && expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeRenderer key={child.path} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-obsidian-900 text-slate-100 select-none">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="h-14 px-5 bg-obsidian-950 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveView('projects')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Back to All Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isRunning ? 'bg-electric-emerald animate-pulse shadow-glow-emerald' : 'bg-slate-600'
              }`}
            />
            <h2 className="text-base font-bold font-mono tracking-tight text-white">
              {activeProject.name}
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {activeProject.framework || activeProject.project_type}
            </span>
            {activeProject.python_venv_path && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                .venv active
              </span>
            )}
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <>
              <button
                onClick={() => restartProcess(runningProc!.processId)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              <button
                onClick={() => stopProcess(runningProc!.processId)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-electric-rose/15 hover:bg-electric-rose/25 text-electric-rose text-xs font-mono font-bold border border-electric-rose/30 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                startProcess({
                  projectId: activeProject.id,
                  profileId: defaultProfile?.id,
                  scriptName: 'dev'
                })
                setActiveView('processes')
              }}
              className="flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-electric-emerald/15 hover:bg-electric-emerald/25 text-electric-emerald text-xs font-mono font-bold border border-electric-emerald/30 shadow-glow-emerald transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>LAUNCH DEFAULT</span>
            </button>
          )}

          {/* AI Crash Diagnostics Button */}
          <button
            onClick={() => {
              diagnoseCrash({
                projectId: activeProject.id,
                processId: runningProc?.processId,
                exitCode: runningProc?.exitCode || 1,
                errorSummary: `Failure diagnostic requested for ${activeProject.name}`
              })
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-mono font-medium border border-indigo-500/40 transition-colors shadow-sm"
            title="Diagnose Failure with Local AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Diagnose Failure</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => openInVsCode(activeProject.path)}
            title="Open in VS Code"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-electric-cyan" />
            <span>VS Code</span>
          </button>

          <button
            onClick={() => openInExplorer(activeProject.path)}
            title="Open in Windows Explorer"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => toggleFavorite(activeProject.id)}
            className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors ${
              activeProject.is_favorite === 1 ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Star className={`w-4 h-4 ${activeProject.is_favorite === 1 ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="h-10 px-5 bg-obsidian-850 border-b border-slate-800 flex items-center space-x-2 shrink-0 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'overview'
              ? 'bg-electric-indigo text-white font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Overview &amp; Architecture Brief</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'schema'
              ? 'bg-electric-indigo text-white font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Schema &amp; Config Viewer</span>
        </button>

        <button
          onClick={() => setActiveTab('tree')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'tree'
              ? 'bg-electric-indigo text-white font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>File Tree Explorer</span>
        </button>

        <button
          onClick={() => setActiveTab('profiles-env')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'profiles-env'
              ? 'bg-electric-indigo text-white font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Launch Profiles &amp; .env</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-obsidian-900">
        {/* ============================================================== */}
        {/* TAB 1: Overview & Architecture Brief */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-4xl">
            {/* Meta Cards Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-obsidian-850 border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 uppercase font-bold text-[10px] block">
                  Filesystem Location
                </span>
                <span className="text-slate-200 font-bold truncate block mt-1" title={activeProject.path}>
                  {activeProject.path}
                </span>
                <span className="text-slate-500 text-[10px] mt-1 block">Zero-modification in-place</span>
              </div>

              <div className="p-3.5 rounded-xl bg-obsidian-850 border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 uppercase font-bold text-[10px] block">
                  Git Version Control
                </span>
                <span className="text-electric-indigo mt-1 font-bold flex items-center space-x-1.5">
                  <GitBranch className="w-4 h-4" />
                  <span>{git?.branch || 'None'}</span>
                  {git && git.dirtyCount > 0 && (
                    <span className="text-amber-400 text-[10px]">({git.dirtyCount} modified)</span>
                  )}
                </span>
                <span className="text-slate-500 text-[10px] mt-1 block truncate">
                  {git?.lastCommitMessage || 'No commit history'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-obsidian-850 border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 uppercase font-bold text-[10px] block">
                  Runtime Environment
                </span>
                <span className="text-electric-emerald mt-1 font-bold block truncate">
                  {activeProject.python_venv_path
                    ? 'Isolated Virtualenv'
                    : `${activeProject.primary_language} Engine`}
                </span>
                <span className="text-slate-500 text-[10px] mt-1 block truncate">
                  {activeProject.python_venv_path || 'Default system PATH'}
                </span>
              </div>
            </div>

            {/* Editable Project Brief & Architecture Notes */}
            <div className="bg-obsidian-850 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Project Brief &amp; Architecture Notes
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Document this project's purpose, design specs, and commands. Saved to local SQLite storage.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {briefSavedMsg && (
                    <span className="text-xs font-mono text-electric-emerald flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{briefSavedMsg}</span>
                    </span>
                  )}
                  <button
                    onClick={handleSaveBrief}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-electric-indigo hover:bg-electric-indigoHover text-white text-xs font-mono font-bold shadow-glow-indigo transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Notes</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">One-Line Brief Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. Real-time sequence analysis engine with FastAPI and WebGL..."
                    value={briefInput}
                    onChange={(e) => setBriefInput(e.target.value)}
                    className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-electric-indigo"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Custom Tech Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Next.js, Tailwind, SQLite, PyTorch, Docker"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-obsidian-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-electric-indigo"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Architecture Notes &amp; Specification (Markdown)</label>
                  <textarea
                    rows={8}
                    placeholder="Write detailed architecture guidelines, port bindings, or build instructions here..."
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    className="w-full bg-obsidian-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-electric-indigo leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: Schema & Config Viewer */}
        {/* ============================================================== */}
        {activeTab === 'schema' && (
          <div className="h-full flex flex-col md:flex-row gap-4">
            {/* File Selector Sidebar */}
            <div className="w-full md:w-64 bg-obsidian-850 border border-slate-800 rounded-xl p-3 flex flex-col shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                Detected Configs ({activeProjectConfigs.length})
              </span>

              {activeProjectConfigs.length === 0 ? (
                <div className="p-4 text-xs font-mono text-slate-500 italic">
                  No Prisma, Docker, SQL, or package configs detected.
                </div>
              ) : (
                <div className="space-y-1 overflow-y-auto mt-2">
                  {activeProjectConfigs.map((cfg) => {
                    const isSelected = selectedConfigFile?.path === cfg.path
                    return (
                      <button
                        key={cfg.path}
                        onClick={() => setSelectedConfigFile(cfg)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-electric-indigo/20 text-electric-indigoGlow border border-electric-indigo/40 font-bold'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{cfg.name}</span>
                        </div>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {cfg.language}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Code Viewer */}
            <div className="flex-1 bg-obsidian-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="h-10 px-4 bg-obsidian-850 border-b border-slate-800 flex items-center justify-between text-xs font-mono shrink-0">
                <span className="font-bold text-slate-200">
                  {selectedConfigFile?.name || 'No file selected'}
                </span>
                <span className="text-[10px] text-slate-500 uppercase">
                  Read-Only Inspection Mode
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed select-text text-slate-300">
                {isLoadingFile ? (
                  <div className="text-slate-500 italic">Reading file...</div>
                ) : (
                  <pre className="whitespace-pre-wrap">{fileContent || 'Empty file'}</pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: File Tree Explorer */}
        {/* ============================================================== */}
        {activeTab === 'tree' && (
          <div className="bg-obsidian-850 border border-slate-800 rounded-xl p-4 max-w-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                  Bounded Directory Tree
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Automatically excludes node_modules, .git, .venv, and build caches.
                </p>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Root: {activeProject.name}
              </span>
            </div>

            {activeProjectTree ? (
              <div className="max-h-[500px] overflow-y-auto">
                <TreeNodeRenderer node={activeProjectTree} level={0} />
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 italic p-4">
                Loading project file hierarchy...
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: Launch Profiles & .env Manager */}
        {/* ============================================================== */}
        {activeTab === 'profiles-env' && (
          <div className="space-y-6 max-w-4xl">
            {/* Launch Profiles Card */}
            <div className="bg-obsidian-850 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Registered Launch Profiles ({profiles.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Launch configurations tailored to this project. Select multiple to run as a <strong>Compound Stack</strong>!
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedCompoundIds.length > 1 && (
                    <button
                      onClick={handleLaunchCompound}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-electric-cyan/20 hover:bg-electric-cyan/30 text-electric-cyan font-mono text-xs font-bold border border-electric-cyan/40 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Launch Compound ({selectedCompoundIds.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowAddProfileModal(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-electric-indigo hover:bg-electric-indigoHover text-white font-mono text-xs font-bold transition-colors shadow-glow-indigo"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Profile</span>
                  </button>
                </div>
              </div>

              {profiles.length === 0 ? (
                <div className="text-xs font-mono text-slate-500 italic p-4">
                  No custom launch profiles registered yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profiles.map((prof) => {
                    const isSelectedCompound = selectedCompoundIds.includes(prof.id)
                    return (
                      <div
                        key={prof.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                          prof.is_default === 1
                            ? 'bg-obsidian-900 border-electric-indigo/40'
                            : 'bg-obsidian-900 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelectedCompound}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCompoundIds([...selectedCompoundIds, prof.id])
                                  } else {
                                    setSelectedCompoundIds(
                                      selectedCompoundIds.filter((id) => id !== prof.id)
                                    )
                                  }
                                }}
                                className="rounded bg-slate-800 border-slate-700 text-electric-cyan focus:ring-0"
                              />
                              <span className="font-bold text-xs font-mono text-slate-100">
                                {prof.name}
                              </span>
                            </label>

                            {prof.is_default === 1 && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-electric-indigo/20 text-electric-indigo border border-electric-indigo/30 uppercase">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="mt-2.5 p-2 rounded bg-obsidian-950 font-mono text-[11px] text-slate-400 truncate">
                            <span className="text-slate-500 font-bold mr-1">$</span>
                            <span>
                              {prof.command} {JSON.parse(prof.args_json || '[]').join(' ')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                          <button
                            onClick={() => {
                              startProcess({
                                projectId: activeProject.id,
                                profileId: prof.id
                              })
                              setActiveView('processes')
                            }}
                            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-electric-emerald/15 hover:bg-electric-emerald/25 text-electric-emerald font-mono text-xs font-bold transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            <span>Run</span>
                          </button>

                          <button
                            onClick={() => handleDeleteProfile(prof.id)}
                            className="p-1 rounded text-slate-600 hover:text-electric-rose transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* .env Key-Value Manager */}
            <div className="bg-obsidian-850 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-electric-indigo" />
                    <span>Environment Variables (.env Manager)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspect, edit, and mask runtime secrets. Safely saves back to your project root's .env file.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
                  >
                    {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecrets ? 'Mask Secrets' : 'Reveal Values'}</span>
                  </button>

                  <button
                    onClick={handleSaveEnvVars}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-electric-emerald/20 hover:bg-electric-emerald/30 text-electric-emerald font-mono text-xs font-bold border border-electric-emerald/40 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save to .env</span>
                  </button>
                </div>
              </div>

              {envSaveMsg && (
                <div className="text-xs font-mono text-electric-emerald flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{envSaveMsg}</span>
                </div>
              )}

              {/* Add Key/Value Input */}
              <div className="flex items-center space-x-2 text-xs font-mono pt-1">
                <input
                  type="text"
                  placeholder="NEW_KEY"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                  className="flex-1 bg-obsidian-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="value"
                  value={newEnvVal}
                  onChange={(e) => setNewEnvVal(e.target.value)}
                  className="flex-1 bg-obsidian-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (newEnvKey.trim()) {
                      setEnvVarsMap({ ...envVarsMap, [newEnvKey.trim()]: newEnvVal })
                      setNewEnvKey('')
                      setNewEnvVal('')
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                >
                  Add Variable
                </button>
              </div>

              {/* Table of variables */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 font-mono text-xs">
                {Object.keys(envVarsMap).length === 0 ? (
                  <div className="text-slate-500 italic py-4">No environment variables defined.</div>
                ) : (
                  Object.entries(envVarsMap).map(([key, val]) => (
                    <div key={key} className="py-2 flex items-center justify-between">
                      <span className="text-electric-cyan font-bold">{key}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={val}
                          onChange={(e) => setEnvVarsMap({ ...envVarsMap, [key]: e.target.value })}
                          className="bg-obsidian-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-slate-600 w-64"
                        />
                        <button
                          onClick={() => {
                            const copy = { ...envVarsMap }
                            delete copy[key]
                            setEnvVarsMap(copy)
                          }}
                          className="p-1 rounded text-slate-600 hover:text-electric-rose"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProfile}
            className="w-full max-w-md bg-obsidian-950 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl font-mono text-xs"
          >
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Create Launch Profile
            </h3>

            <div>
              <label className="block text-slate-400 mb-1">Profile Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Test Suite, Fast API Reload"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Command Executable</label>
              <input
                type="text"
                required
                placeholder="e.g. npm.cmd, python.exe, cargo"
                value={newProfileCommand}
                onChange={(e) => setNewProfileCommand(e.target.value)}
                className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Arguments (Space-separated)</label>
              <input
                type="text"
                placeholder="e.g. run dev, -m uvicorn app:app --reload"
                value={newProfileArgs}
                onChange={(e) => setNewProfileArgs(e.target.value)}
                className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-4 pt-1">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newProfileDefault}
                  onChange={(e) => setNewProfileDefault(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-electric-indigo focus:ring-0"
                />
                <span>Set as Default</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newProfilePreview}
                  onChange={(e) => setNewProfilePreview(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-electric-indigo focus:ring-0"
                />
                <span>Auto-open Browser Preview</span>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddProfileModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-electric-indigo hover:bg-electric-indigoHover text-white font-bold"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
