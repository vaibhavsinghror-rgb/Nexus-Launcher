import { create } from 'zustand'
import type {
  ProjectRecord,
  LaunchProfileRecord,
  CreateProjectInput,
  ScannedProject,
  GitStatus,
  EnvVariable,
  ProjectConfigFile,
  FileTreeNode
} from '../../../shared/ipc-types'

export type NavView = 'dashboard' | 'projects' | 'processes' | 'ports' | 'ai' | 'settings' | 'project-detail'

interface LauncherStore {
  activeView: NavView
  sidebarCollapsed: boolean
  projects: ProjectRecord[]
  launchProfiles: Record<string, LaunchProfileRecord[]> // projectId -> profiles
  selectedProjectId: string | null
  activeProject: ProjectRecord | null
  projectGitStatuses: Record<string, GitStatus> // projectId -> gitStatus
  searchQuery: string
  techStackFilter: string
  onlyFavorites: boolean
  onlyRunning: boolean
  viewMode: 'grid' | 'list'
  isScanning: boolean
  isLoadingProjects: boolean

  // Active Project Detail data
  activeProjectConfigs: ProjectConfigFile[]
  activeProjectTree: FileTreeNode | null
  activeProjectEnvVars: EnvVariable[]

  setActiveView: (view: NavView) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSearchQuery: (query: string) => void
  setTechStackFilter: (filter: string) => void
  setOnlyFavorites: (only: boolean) => void
  setOnlyRunning: (only: boolean) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setSelectedProjectId: (id: string | null) => void

  loadProjects: () => Promise<void>
  loadProjectDetailData: (projectId: string) => Promise<void>
  loadLaunchProfiles: (projectId: string) => Promise<void>
  addProject: (input: CreateProjectInput) => Promise<ProjectRecord>
  scanAndAddDirectory: () => Promise<void>
  importFromPath: (pathStr: string) => Promise<ProjectRecord | null>
  toggleFavorite: (projectId: string) => Promise<void>
  updateProjectBrief: (projectId: string, brief: string, description?: string, tags?: string[]) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  openInVsCode: (path: string) => Promise<boolean>
  openInExplorer: (path: string) => Promise<boolean>
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
  activeView: 'dashboard',
  sidebarCollapsed: false,
  projects: [],
  launchProfiles: {},
  selectedProjectId: null,
  activeProject: null,
  projectGitStatuses: {},
  searchQuery: '',
  techStackFilter: 'all',
  onlyFavorites: false,
  onlyRunning: false,
  viewMode: 'grid',
  isScanning: false,
  isLoadingProjects: false,

  activeProjectConfigs: [],
  activeProjectTree: null,
  activeProjectEnvVars: [],

  setActiveView: (activeView) => set({ activeView }),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    set({ sidebarCollapsed: next })
    window.nexus.settings.set('sidebar_collapsed', next)
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    set({ sidebarCollapsed })
    window.nexus.settings.set('sidebar_collapsed', sidebarCollapsed)
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTechStackFilter: (techStackFilter) => set({ techStackFilter }),
  setOnlyFavorites: (onlyFavorites) => set({ onlyFavorites }),
  setOnlyRunning: (onlyRunning) => set({ onlyRunning }),
  setViewMode: (viewMode) => set({ viewMode }),

  setSelectedProjectId: (selectedProjectId) => {
    const proj = get().projects.find((p) => p.id === selectedProjectId) || null
    set({ selectedProjectId, activeProject: proj })
    if (selectedProjectId) {
      get().loadLaunchProfiles(selectedProjectId)
      get().loadProjectDetailData(selectedProjectId)
    }
  },

  loadProjects: async () => {
    set({ isLoadingProjects: true })
    try {
      const list = await window.nexus.projects.getAll()
      set({ projects: list })

      const savedCollapsed = await window.nexus.settings.get('sidebar_collapsed', false)
      set({ sidebarCollapsed: savedCollapsed })

      if (!get().selectedProjectId && list.length > 0) {
        get().setSelectedProjectId(list[0].id)
      }

      // Fetch git status for each project in background
      for (const p of list) {
        window.nexus.git.getStatus(p.path).then((status) => {
          set((state) => ({
            projectGitStatuses: {
              ...state.projectGitStatuses,
              [p.id]: status
            }
          }))
        })
      }
    } catch (err) {
      console.error('Failed to load projects from SQLite:', err)
    } finally {
      set({ isLoadingProjects: false })
    }
  },

  loadLaunchProfiles: async (projectId: string) => {
    try {
      const profiles = await window.nexus.launchProfiles.getByProjectId(projectId)
      set((state) => ({
        launchProfiles: {
          ...state.launchProfiles,
          [projectId]: profiles
        }
      }))
    } catch (err) {
      console.error('Failed to load launch profiles:', err)
    }
  },

  loadProjectDetailData: async (projectId: string) => {
    const proj = get().projects.find((p) => p.id === projectId)
    if (!proj) return

    try {
      const [configs, tree, envVars, gitStatus] = await Promise.all([
        window.nexus.config.getFiles(proj.path),
        window.nexus.files.getTree(proj.path, 3),
        window.nexus.env.getVars(proj.path),
        window.nexus.git.getStatus(proj.path)
      ])

      set((state) => ({
        activeProjectConfigs: configs,
        activeProjectTree: tree,
        activeProjectEnvVars: envVars,
        projectGitStatuses: {
          ...state.projectGitStatuses,
          [projectId]: gitStatus
        }
      }))
    } catch (err) {
      console.error('Failed to load project detail data:', err)
    }
  },

  addProject: async (input) => {
    const project = await window.nexus.projects.create(input)
    await get().loadProjects()
    get().setSelectedProjectId(project.id)
    return project
  },

  importFromPath: async (pathStr: string) => {
    const scanned = await window.nexus.projects.inspectPath(pathStr)
    if (!scanned) {
      alert(`The path "${pathStr}" does not exist or is not a valid directory.`)
      return null
    }

    const created = await get().addProject({
      name: scanned.name,
      path: scanned.path,
      project_type: scanned.type,
      framework: scanned.framework,
      primary_language: scanned.primaryLanguage,
      python_venv_path: scanned.pythonVenvPath ?? undefined
    })

    return created
  },

  scanAndAddDirectory: async () => {
    try {
      const selectedDir = await window.nexus.system.selectDirectory()
      if (!selectedDir) return

      set({ isScanning: true })
      const scanned = await window.nexus.projects.scanDirectory(selectedDir)

      if (scanned.length === 0) {
        const name = selectedDir.split(/[\\/]/).pop() || 'New Project'
        await get().addProject({
          name,
          path: selectedDir,
          project_type: 'other',
          primary_language: 'General'
        })
      } else {
        for (const item of scanned) {
          await get().addProject({
            name: item.name,
            path: item.path,
            project_type: item.type,
            framework: item.framework,
            primary_language: item.primaryLanguage,
            python_venv_path: item.pythonVenvPath ?? undefined
          })
        }
      }

      await get().loadProjects()
      set({ activeView: 'projects' })
    } catch (err: any) {
      alert(`Directory import failed: ${err.message}`)
    } finally {
      set({ isScanning: false })
    }
  },

  toggleFavorite: async (projectId: string) => {
    const proj = get().projects.find((p) => p.id === projectId)
    if (!proj) return
    const nextFav = proj.is_favorite === 1 ? 0 : 1
    await window.nexus.projects.update(projectId, { is_favorite: nextFav === 1 })
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, is_favorite: nextFav } : p
      ),
      activeProject:
        state.activeProject?.id === projectId
          ? { ...state.activeProject, is_favorite: nextFav }
          : state.activeProject
    }))
  },

  updateProjectBrief: async (projectId, brief, description, tags) => {
    await window.nexus.projects.update(projectId, {
      brief,
      description,
      tags
    })
    set((state) => {
      const updated = state.projects.map((p) => {
        if (p.id !== projectId) return p
        return {
          ...p,
          brief,
          description: description ?? p.description,
          tags_json: tags ? JSON.stringify(tags) : p.tags_json
        }
      })
      return {
        projects: updated,
        activeProject: updated.find((p) => p.id === projectId) || state.activeProject
      }
    })
  },

  deleteProject: async (projectId: string) => {
    await window.nexus.projects.delete(projectId)
    const list = get().projects.filter((p) => p.id !== projectId)
    set({
      projects: list,
      selectedProjectId: list[0]?.id || null,
      activeProject: list[0] || null
    })
  },

  openInVsCode: async (path: string) => {
    return window.nexus.system.openInVsCode(path)
  },

  openInExplorer: async (path: string) => {
    return window.nexus.system.openPath(path)
  }
}))
