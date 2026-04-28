import { create } from 'zustand'

export type ViewType = 'home' | 'workspace'
export type TabType = 'architecture' | 'characters' | 'worldview' | 'outline' | 'writing' | 'refine' | 'export' | 'settings'

interface AppState {
  currentView: ViewType
  currentProjectId: string | null
  activeTab: TabType
  setView: (view: ViewType) => void
  setProject: (projectId: string | null) => void
  setTab: (tab: TabType) => void
  navigateToWorkspace: (projectId: string) => void
  navigateToHome: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  currentProjectId: null,
  activeTab: 'architecture',
  setView: (view) => set({ currentView: view }),
  setProject: (projectId) => set({ currentProjectId: projectId }),
  setTab: (tab) => set({ activeTab: tab }),
  navigateToWorkspace: (projectId) =>
    set({ currentView: 'workspace', currentProjectId: projectId, activeTab: 'architecture' }),
  navigateToHome: () =>
    set({ currentView: 'home', currentProjectId: null, activeTab: 'architecture' }),
}))
