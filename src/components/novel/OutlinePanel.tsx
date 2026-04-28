'use client'

import { useEffect, useState } from 'react'
import { List, Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface ChapterOutline {
  id: string
  chapterNumber: number
  title: string
  summary: string
  keyPoints: string
  foreshadowing: string
  emotionBeat: string
  conflicts: string
}

interface OutlinePanelProps {
  projectId: string
  chapterCount: number
}

export function OutlinePanel({ projectId, chapterCount }: OutlinePanelProps) {
  const [outlines, setOutlines] = useState<ChapterOutline[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchOutlines()
  }, [projectId])

  const fetchOutlines = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/chapter-outlines?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setOutlines(data)
      }
    } catch {
      toast.error('加载大纲失败')
    } finally {
      setLoading(false)
    }
  }

  const [generateProgress, setGenerateProgress] = useState('')

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setGenerateProgress('AI正在分析架构与角色信息...')
      const res = await fetch('/api/chapter-outlines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (res.ok) {
        const data = await res.json()
        setOutlines(data)
        toast.success(`生成了 ${data.length} 章大纲`)
      } else {
        const errorData = await res.json().catch(() => null)
        toast.error(errorData?.error || '大纲生成失败，请稍后重试')
      }
    } catch {
      toast.error('大纲生成失败，请检查网络连接后重试')
    } finally {
      setGenerating(false)
    }
  }

  const parseJSON = (str: string): string[] => {
    if (!str) return []
    try {
      return JSON.parse(str)
    } catch {
      return str.split(',').map((s) => s.trim())
    }
  }

  const completionPercent = Math.round((outlines.length / chapterCount) * 100)

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">章节大纲</h2>
        </div>
        <div className="flex items-center gap-2">
          {outlines.length > 0 && (
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="border-amber-200 dark:border-stone-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-stone-800"
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {generating ? '生成中...' : '重新生成'}
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? generateProgress || '生成中...' : '生成大纲'}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-stone-500 dark:text-stone-400">大纲进度</span>
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            {outlines.length} / {chapterCount} 章 ({completionPercent}%)
          </span>
        </div>
        <Progress value={completionPercent} className="h-2" />
      </div>

      {outlines.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-stone-800 flex items-center justify-center">
            <List className="w-8 h-8 text-amber-400 dark:text-amber-500" />
          </div>
          <h3 className="text-base font-medium text-stone-600 dark:text-stone-400">暂无大纲</h3>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            点击"生成大纲"，AI将根据架构和角色信息为你创建完整的章节大纲
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
          {outlines.map((outline) => {
            const isExpanded = expandedId === outline.id
            const keyPoints = parseJSON(outline.keyPoints)
            const foreshadowing = parseJSON(outline.foreshadowing)
            const conflicts = parseJSON(outline.conflicts)

            return (
              <Collapsible
                key={outline.id}
                open={isExpanded}
                onOpenChange={(open) => setExpandedId(open ? outline.id : null)}
              >
                <Card className="border-amber-100 dark:border-stone-700 hover:border-amber-300 dark:hover:border-stone-500 transition-colors">
                  <CollapsibleTrigger asChild>
                    <CardContent className="py-3 px-4 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-stone-700 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-400 shrink-0">
                          {outline.chapterNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                              {outline.title || `第${outline.chapterNumber}章`}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-amber-200 dark:border-stone-600 shrink-0">
                              {outline.emotionBeat || '未设定'}
                            </Badge>
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                            {outline.summary || '暂无摘要'}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="border-t border-amber-100 dark:border-stone-700 pt-3 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">章节摘要</p>
                          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{outline.summary}</p>
                        </div>
                        {keyPoints.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">关键点</p>
                            <div className="flex flex-wrap gap-1">
                              {keyPoints.map((point, i) => (
                                <Badge key={i} variant="outline" className="text-xs border-amber-200 dark:border-stone-600">
                                  {point}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {foreshadowing.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">伏笔</p>
                            <div className="flex flex-wrap gap-1">
                              {foreshadowing.map((item, i) => (
                                <Badge key={i} className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {conflicts.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">冲突</p>
                            <div className="flex flex-wrap gap-1">
                              {conflicts.map((item, i) => (
                                <Badge key={i} className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}
    </div>
  )
}
