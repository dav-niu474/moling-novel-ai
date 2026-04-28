'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { ArchitecturePanel } from './ArchitecturePanel'
import { CharactersPanel } from './CharactersPanel'
import { WorldviewPanel } from './WorldviewPanel'
import { OutlinePanel } from './OutlinePanel'
import { WritingPanel } from './WritingPanel'
import { RefinePanel } from './RefinePanel'
import { ExportPanel } from './ExportPanel'
import { SettingsPanel } from './SettingsPanel'
import { toast } from 'sonner'

interface Project {
  id: string
  title: string
  genre: string
  description: string
  chapterCount: number
  wordsPerChapter: number
  coreSeed: string
  status: string
  createdAt: string
  updatedAt: string
}

const tabLabels: Record<string, string> = {
  architecture: '架构',
  characters: '角色',
  worldview: '世界观',
  outline: '大纲',
  writing: '写作',
  refine: '润色',
  export: '导出',
  settings: '设置',
}

export function ProjectWorkspace() {
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const activeTab = useAppStore((s) => s.activeTab)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentProjectId) {
      fetchProject()
    }
  }, [currentProjectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${currentProjectId}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      } else {
        toast.error('加载项目失败')
      }
    } catch {
      toast.error('加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  const renderPanel = () => {
    if (!project) return null

    const commonProps = { projectId: project.id, project }

    switch (activeTab) {
      case 'architecture':
        return <ArchitecturePanel {...commonProps} />
      case 'characters':
        return <CharactersPanel projectId={project.id} />
      case 'worldview':
        return <WorldviewPanel projectId={project.id} />
      case 'outline':
        return <OutlinePanel projectId={project.id} chapterCount={project.chapterCount} />
      case 'writing':
        return <WritingPanel projectId={project.id} chapterCount={project.chapterCount} />
      case 'refine':
        return <RefinePanel projectId={project.id} />
      case 'export':
        return <ExportPanel {...commonProps} />
      case 'settings':
        return <SettingsPanel />
      default:
        return <ArchitecturePanel {...commonProps} />
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex">
        <WorkspaceSidebar />
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <WorkspaceSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="h-12 border-b border-amber-100 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-sm">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium text-stone-700 dark:text-stone-300 truncate max-w-[200px]">
              {project?.title}
            </span>
          </div>
          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {tabLabels[activeTab]}
          </span>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderPanel()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
