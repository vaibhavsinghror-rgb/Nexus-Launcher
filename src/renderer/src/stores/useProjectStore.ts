import { create } from 'zustand'
import type { Project, GitStatus, EnvVariable } from '../../../shared/ipc-types'

interface ProjectStore {
  projects: Project[]
  selectedProjectId: string | null
  activeProject: Project | null
  searchQuery: string
  activeView: 'dashboard' | 'detail' | 'database' | 'ai' | 'patch'
  currentGitStatus: GitStatus | null
  currentEnvVars: EnvVariable[]
  isLoading: boolean
  isScanning: boolean

  setProjects: (projects: Project[]) => void
  selectProject: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setActiveView: (view: 'dashboard' | 'detail' | 'database' | 'ai' | 'patch') => void
  loadProjects: () => Promise<void>
  loadProjectDetail: (id: string) => Promise<void>
  addProjectByDirectory: () => Promise<void>
  removeProject: (id: string) => Promise<void>
  refreshProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  activeProject: null,
  searchQuery: '',
  activeView: 'dashboard',
  currentGitStatus: null,
  currentEnvVars: [],
  isLoading: false,
  isScanning: false,

  setProjects: (projects) => set({ projects }),
  selectProject: (id) => {
    const proj = get().projects.find((p) => p.id === id) || null
    set({ selectedProjectId: id, activeProject: proj })
    if (id) {
      get().loadProjectDetail(id)
    }
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveView: (activeView) => set({ activeView }),

  loadProjects: async () => {
    set({ isLoading: true })
    try {
      const list = await window.nexus.projects.getAll()
      set({ projects: list })
      if (!get().selectedProjectId && list.length > 0) {
        get().selectProject(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  loadProjectDetail: async (id: string) => {
    const proj = get().projects.find((p) => p.id === id)
    if (!proj) return

    try {
      const [gitStatus, envVars] = await Promise.all([
        window.nexus.git.getStatus(proj.path),
        window.nexus.env.getVars(proj.path)
      ])
      set({ currentGitStatus: gitStatus, currentEnvVars: envVars })
    } catch (err) {
      console.error('Failed to load project details:', err)
    }
  },

  addProjectByDirectory: async () => {
    try {
      const dir = await window.nexus.system.selectDirectory()
      if (!dir) return

      set({ isScanning: true })
      const added = await window.nexus.projects.add({ path: dir })
      await get().loadProjects()
      get().selectProject(added.id)
      set({ activeView: 'detail' })
    } catch (err: any) {
      alert(`Could not add project: ${err.message}`)
    } finally {
      set({ isScanning: false })
    }
  },

  removeProject: async (id: string) => {
    try {
      await window.nexus.projects.remove(id)
      const list = get().projects.filter((p) => p.id !== id)
      set({ projects: list })
      if (get().selectedProjectId === id) {
        set({
          selectedProjectId: list[0]?.id || null,
          activeProject: list[0] || null
        })
      }
    } catch (err) {
      console.error('Failed to remove project:', err)
    }
  },

  refreshProject: async (id: string) => {
    try {
      const refreshed = await window.nexus.projects.refresh(id)
      if (refreshed) {
        const list = get().projects.map((p) => (p.id === id ? refreshed : p))
        set({
          projects: list,
          activeProject: get().selectedProjectId === id ? refreshed : get().activeProject
        })
        if (get().selectedProjectId === id) {
          get().loadProjectDetail(id)
        }
      }
    } catch (err) {
      console.error('Failed to refresh project:', err)
    }
  }
}))
