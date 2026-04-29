'use client'

import { useEffect, useState } from 'react'
import {
  PenTool,
  Sparkles,
  Loader2,
  Wand2,
  Expand,
  Paintbrush,
  Shield,
  FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface ChapterContent {
  id: string
  chapterNumber: number
  content: string
  wordCount: number
  status: string
}

interface ChapterOutline {
  id: string
  chapterNumber: number
  title: string
  summary: string
}

interface WritingPanelProps {
  projectId: string
  chapterCount: number
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  generated: { label: '已生成', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  polished: { label: '已润色', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  finalized: { label: '已定稿', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
}

export function WritingPanel({ projectId, chapterCount }: WritingPanelProps) {
  const [chapters, setChapters] = useState<ChapterContent[]>([])
  const [outlines, setOutlines] = useState<ChapterOutline[]>([])
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [refining, setRefining] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [streamingText, setStreamingText] = useState('')

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [chaptersRes, outlinesRes] = await Promise.all([
        fetch(`/api/chapter-contents?projectId=${projectId}`),
        fetch(`/api/chapter-outlines?projectId=${projectId}`),
      ])
      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json()
        setChapters(chaptersData)
        if (chaptersData.length > 0 && !selectedChapter) {
          setSelectedChapter(chaptersData[0].chapterNumber)
          setTextContent(chaptersData[0].content || '')
        }
      }
      if (outlinesRes.ok) {
        setOutlines(await outlinesRes.json())
      }
    } catch {
      toast.error('加载章节数据失败')
    } finally {
      setLoading(false)
    }
  }

  const getChapter = (num: number) => chapters.find((c) => c.chapterNumber === num)
  const getOutline = (num: number) => outlines.find((o) => o.chapterNumber === num)

  const handleSelectChapter = (num: number) => {
    const chapter = getChapter(num)
    setSelectedChapter(num)
    setTextContent(chapter?.content || '')
    setStreamingText('')
  }

  const handleGenerate = async () => {
    if (!selectedChapter) return

    try {
      setGenerating(true)
      setStreamingText('')

      const res = await fetch('/api/chapter-contents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterNumber: selectedChapter }),
      })

      if (res.ok) {
        // Try streaming
        const reader = res.body?.getReader()
        if (reader) {
          const decoder = new TextDecoder()
          let fullText = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            fullText += chunk
            setStreamingText(fullText)
          }
          setTextContent(fullText)
          setStreamingText('')
          updateChapterState(selectedChapter, fullText, 'generated')
          toast.success('章节生成完成')
        }
      } else {
        const errorData = await res.json().catch(() => null)
        toast.error(errorData?.error || '章节生成失败，请稍后重试')
      }
    } catch {
      toast.error('章节生成失败，请检查网络连接后重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleToolbarAction = async (action: string) => {
    if (!selectedChapter || !textContent.trim()) {
      toast.error('请先选择章节并确保有内容')
      return
    }

    try {
      setRefining(true)

      if (action === 'check') {
        // Use the dedicated consistency check endpoint
        const res = await fetch(`/api/projects/${projectId}/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterNumber: selectedChapter, content: textContent }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            const { issues, totalIssues, highSeverity, mediumSeverity, lowSeverity } = data.data
            if (totalIssues === 0) {
              toast.success('一致性检查完成：未发现问题 ✓')
            } else {
              // Display issues in a user-friendly format
              const issueList = issues.map((issue: any, i: number) => {
                const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢'
                return `${severityIcon} ${issue.description}\n   💡 ${issue.suggestion}`
              }).join('\n\n')
              toast[highSeverity > 0 ? 'error' : 'warning'](
                `发现 ${totalIssues} 个问题（高${highSeverity} 中${mediumSeverity} 低${lowSeverity}）`,
                { description: issueList, duration: 8000 }
              )
            }
          } else {
            toast.error('一致性检查结果格式异常')
          }
        } else {
          const errorData = await res.json().catch(() => null)
          toast.error(errorData?.error || '一致性检查失败，请稍后重试')
        }
      } else {
        // Use the refine endpoint for other actions
        const res = await fetch('/api/chapter-contents/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, chapterNumber: selectedChapter, action, content: textContent }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.content) {
            setTextContent(data.content)
            updateChapterState(selectedChapter, data.content, action === 'polish' ? 'polished' : undefined)
            // Auto-save refined content to DB
            try {
              await fetch('/api/chapter-contents', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  chapterNumber: selectedChapter,
                  content: data.content,
                  wordCount: data.content.length,
                }),
              })
            } catch {
              // Auto-save failed silently — user can still manually save
              console.warn('Auto-save after refine failed')
            }
            toast.success('处理完成（已自动保存）')
          } else {
            toast.error('处理结果格式异常')
          }
        } else {
          const errorData = await res.json().catch(() => null)
          toast.error(errorData?.error || '文本处理失败，请稍后重试')
        }
      }
    } catch {
      toast.error('处理失败，请检查网络连接后重试')
    } finally {
      setRefining(false)
    }
  }

  const handleContextMenuAction = async (action: string) => {
    const selection = window.getSelection()?.toString()
    if (!selection) {
      toast.error('请先选择文本')
      return
    }

    try {
      setRefining(true)
      const res = await fetch('/api/chapter-contents/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterNumber: selectedChapter, action, content: selection }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.content) {
          // Replace the selected text in the content with the refined version
          const newContent = textContent.replace(selection, data.content)
          setTextContent(newContent)
          updateChapterState(selectedChapter!, newContent)
          toast.success('处理完成')
        } else {
          toast.error('处理结果格式异常')
        }
      } else {
        const errorData = await res.json().catch(() => null)
        toast.error(errorData?.error || '文本处理失败，请稍后重试')
      }
    } catch {
      toast.error('文本处理失败，请检查网络连接后重试')
    } finally {
      setRefining(false)
    }
  }

  const handleSaveContent = async () => {
    if (!selectedChapter) return

    try {
      const res = await fetch('/api/chapter-contents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          chapterNumber: selectedChapter,
          content: textContent,
          wordCount: textContent.length,
        }),
      })
      if (res.ok) {
        updateChapterState(selectedChapter, textContent)
        toast.success('保存成功')
      }
    } catch {
      toast.error('保存失败')
    }
  }

  const updateChapterState = (chapterNum: number, content: string, newStatus?: string) => {
    setChapters((prev) => {
      const existing = prev.find((c) => c.chapterNumber === chapterNum)
      if (existing) {
        return prev.map((c) =>
          c.chapterNumber === chapterNum
            ? { ...c, content, wordCount: content.length, status: newStatus || c.status }
            : c
        )
      } else {
        return [
          ...prev,
          {
            id: `local-${chapterNum}`,
            chapterNumber: chapterNum,
            content,
            wordCount: content.length,
            status: newStatus || 'draft',
          },
        ]
      }
    })
  }

  // Generate chapter list entries (including those without content yet)
  const allChapterEntries = Array.from({ length: chapterCount }, (_, i) => {
    const num = i + 1
    const chapter = getChapter(num)
    const outline = getOutline(num)
    return {
      number: num,
      title: outline?.title || `第${num}章`,
      status: chapter?.status || 'draft',
      wordCount: chapter?.wordCount || 0,
      hasContent: !!chapter?.content,
    }
  })

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex gap-4 h-[calc(100vh-140px)]">
          <Skeleton className="w-64 shrink-0 rounded-xl" />
          <Skeleton className="flex-1 rounded-xl" />
        </div>
      </div>
    )
  }

  const currentChapter = selectedChapter ? getChapter(selectedChapter) : null
  const currentStatus = statusConfig[currentChapter?.status || 'draft']

  return (
    <div className="h-[calc(100vh-104px)] flex">
      {/* Chapter List */}
      <div className="w-56 sm:w-64 shrink-0 border-r border-amber-100 dark:border-stone-700 flex flex-col">
        <div className="p-3 border-b border-amber-100 dark:border-stone-700">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
            <PenTool className="w-4 h-4 text-amber-500" />
            章节列表
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {allChapterEntries.map((entry) => {
              const isActive = selectedChapter === entry.number
              const status = statusConfig[entry.status]
              return (
                <button
                  key={entry.number}
                  onClick={() => handleSelectChapter(entry.number)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-all duration-150
                    ${isActive
                      ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
                      : 'hover:bg-amber-50 dark:hover:bg-stone-800 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isActive ? 'text-amber-700 dark:text-amber-400' : 'text-stone-400'}`}>
                      {entry.number}
                    </span>
                    <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${isActive ? 'text-stone-800 dark:text-stone-200' : 'text-stone-600 dark:text-stone-400'}`}>
                    {entry.title}
                  </p>
                  {entry.wordCount > 0 && (
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                      {entry.wordCount} 字
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-11 border-b border-amber-100 dark:border-stone-700 flex items-center px-3 gap-1.5 shrink-0 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="h-7 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs"
          >
            {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {generating ? 'AI生成中...' : '生成'}
          </Button>
          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToolbarAction('polish')}
            disabled={refining || !textContent}
            className="h-7 text-xs text-stone-600 dark:text-stone-400"
          >
            {refining ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Paintbrush className="w-3 h-3 mr-1" />}
            润色
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToolbarAction('expand')}
            disabled={refining || !textContent}
            className="h-7 text-xs text-stone-600 dark:text-stone-400"
          >
            <Expand className="w-3 h-3 mr-1" />
            扩写
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToolbarAction('de-ai')}
            disabled={refining || !textContent}
            className="h-7 text-xs text-stone-600 dark:text-stone-400"
          >
            <Wand2 className="w-3 h-3 mr-1" />
            去AI味
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToolbarAction('check')}
            disabled={refining || !textContent}
            className="h-7 text-xs text-stone-600 dark:text-stone-400"
          >
            <Shield className="w-3 h-3 mr-1" />
            一致性检查
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {currentStatus && (
              <Badge className={`text-[10px] ${currentStatus.color}`}>{currentStatus.label}</Badge>
            )}
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {textContent.length} 字
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveContent}
              className="h-7 text-xs border-amber-200 dark:border-stone-600"
            >
              <FileText className="w-3 h-3 mr-1" />
              保存
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden">
          {selectedChapter ? (
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="h-full">
                  <Textarea
                    value={streamingText || textContent}
                    onChange={(e) => {
                      if (!generating) {
                        setTextContent(e.target.value)
                        setStreamingText('')
                      }
                    }}
                    placeholder='选择章节后点击"生成"开始创作，或直接输入内容...'
                    className="h-full border-0 rounded-none resize-none focus-visible:ring-0 bg-amber-50/30 dark:bg-stone-900/30 text-stone-800 dark:text-stone-200 leading-relaxed text-sm p-6 font-serif"
                    readOnly={generating}
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleContextMenuAction('polish')}>
                  <Paintbrush className="w-4 h-4 mr-2" />
                  AI润色
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleContextMenuAction('expand')}>
                  <Expand className="w-4 h-4 mr-2" />
                  AI扩写
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleContextMenuAction('de-ai')}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  去AI味
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleContextMenuAction('conflict')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  强化冲突
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleContextMenuAction('detail')}>
                  <FileText className="w-4 h-4 mr-2" />
                  增加细节
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <PenTool className="w-12 h-12 text-amber-300 dark:text-amber-600 mx-auto mb-3" />
                <p className="text-sm text-stone-500 dark:text-stone-400">从左侧选择一个章节开始写作</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
