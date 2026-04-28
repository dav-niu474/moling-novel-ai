'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Clock, FileText, Plus, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/lib/store'
import { CreateProjectDialog } from './CreateProjectDialog'
import { toast } from 'sonner'

interface Project {
  id: string
  title: string
  genre: string
  description: string
  chapterCount: number
  wordsPerChapter: number
  status: string
  createdAt: string
  updatedAt: string
  _count?: {
    characters: number
    chapterContents: number
  }
}

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  architecting: { label: '架构中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  outlining: { label: '大纲中', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  writing: { label: '写作中', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
}

const genreMap: Record<string, string> = {
  xuanhuan: '玄幻',
  xianxia: '仙侠',
  urban: '都市',
  scifi: '科幻',
  history: '历史',
  wuxia: '武侠',
  games: '游戏',
  sports: '体育',
  suspense: '悬疑',
  romance: '言情',
  fantasy: '奇幻',
  military: '军事',
  other: '其他',
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const navigateToWorkspace = useAppStore((s) => s.navigateToWorkspace)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch {
      toast.error('加载项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id))
        toast.success('项目已删除')
      }
    } catch {
      toast.error('删除项目失败')
    }
  }

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev])
    setCreateDialogOpen(false)
    toast.success('项目创建成功')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-800 border-b border-amber-100 dark:border-stone-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                墨灵
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-amber-800/70 dark:text-amber-200/70 mt-2">
              AI驱动的网文创作平台
            </p>
            <p className="text-sm text-amber-700/50 dark:text-amber-300/50 mt-1">
              从灵感到完稿，让AI助你构建宏大的小说世界
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">我的项目</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              共 {projects.length} 个项目
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建新项目
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-amber-100 dark:border-stone-700">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-50 dark:bg-stone-800 flex items-center justify-center">
              <FileText className="w-10 h-10 text-amber-400 dark:text-amber-500" />
            </div>
            <h3 className="text-lg font-medium text-stone-700 dark:text-stone-300">还没有项目</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 mb-6">
              创建你的第一个小说项目，开始AI辅助创作之旅
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建新项目
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {projects.map((project, index) => {
              const status = statusMap[project.status] || statusMap.draft
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer border-amber-100 dark:border-stone-700 hover:border-amber-300 dark:hover:border-stone-500 hover:shadow-lg transition-all duration-200 group"
                    onClick={() => navigateToWorkspace(project.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold text-stone-800 dark:text-stone-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                          {project.title}
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProject(project.id)
                              }}
                              className="text-red-600 dark:text-red-400"
                            >
                              删除项目
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-amber-200 dark:border-stone-600 text-amber-700 dark:text-amber-400">
                          {genreMap[project.genre] || project.genre}
                        </Badge>
                        <Badge className={`text-xs ${status.color}`}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 mb-3">
                        {project.description || '暂无描述'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {project.chapterCount}章
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {project._count?.chapterContents || 0}篇
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(project.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-amber-100 dark:border-stone-700 bg-amber-50/50 dark:bg-stone-900/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-stone-400 dark:text-stone-500">
          墨灵 — AI驱动的网文创作平台 · 以墨为灵，以笔为魂
        </div>
      </footer>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}
