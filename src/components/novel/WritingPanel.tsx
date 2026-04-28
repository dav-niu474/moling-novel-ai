'use client'

import { useEffect, useState, useCallback } from 'react'
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
        // Demo streaming simulation
        const demoText = `第${selectedChapter}章

晨光初照，灵气如薄雾般缭绕在青石山道上。

少年林逸背负长剑，一步步攀上陡峭的山路。他的呼吸沉稳而有力，每一步都踏在灵气最浓郁的位置，仿佛与天地之间有着某种默契。

"又来了。"山门前，守门弟子赵明远远望见林逸的身影，嘴角微微抽动。

自从三个月前那场意外之后，这个曾经默默无闻的外门弟子，便每日卯时登山，风雨无阻。起初众人都以为他不过是一时兴起，没想到他竟坚持了整整九十天。

林逸走到山门前，停下脚步，向着赵明微微点头致意。

"今日的灵气比往日浓郁了三分。"他平静地说。

赵明一愣，随即嗤笑道："你一个炼气三层的废物，也能感知灵气浓度？"

林逸没有回答，只是目光平静地看了他一眼，然后转身走向修炼场。那目光中没有愤怒，没有委屈，只有一种令人心悸的淡然。

赵明被这一眼看得莫名心虚，张了张嘴，终究没有再说什么。

修炼场上，几名外门弟子正在比试。刀光剑影之间，灵气激荡，好不热闹。林逸在角落盘膝而坐，缓缓闭上了眼睛。

他的意识沉入体内，感受着丹田中那颗奇异的金色光点。三个月前，正是这颗光点的出现，改变了他的命运。

"它又在跳动了......"林逸喃喃自语。

金色光点的每一次跳动，都带来一股温热的能量，沿着经脉流遍全身。他能感觉到自己的修为在缓慢而坚定地提升。

忽然，一阵急促的钟声从主峰传来——

"铛——铛——铛——"

三声钟响，这是宗门召集所有弟子的信号。

林逸睁开眼睛，嘴角微微上扬。他知道，今天会有不同寻常的事情发生。

而他，已经准备好了。`

        let i = 0
        const streamInterval = setInterval(() => {
          if (i >= demoText.length) {
            clearInterval(streamInterval)
            setTextContent(demoText)
            setStreamingText('')
            setGenerating(false)
            updateChapterState(selectedChapter, demoText, 'generated')
            toast.success('章节生成完成（演示模式）')
            return
          }
          const chunkSize = Math.min(3 + Math.floor(Math.random() * 5), demoText.length - i)
          i += chunkSize
          setStreamingText(demoText.slice(0, i))
        }, 30)
      }
    } catch {
      toast.error('生成章节失败')
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
      const res = await fetch('/api/chapter-contents/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterNumber: selectedChapter, action, content: textContent }),
      })

      if (res.ok) {
        const data = await res.json()
        setTextContent(data.content)
        updateChapterState(selectedChapter, data.content, action === 'polish' ? 'polished' : undefined)
        toast.success('处理完成')
      } else {
        // Demo - just add a note
        const prefixes: Record<string, string> = {
          polish: '\n\n[润色后：文字更加流畅自然，去除了冗余表达]',
          expand: '\n\n[扩写后：增加了更多细节描写和内心独白]',
          'de-ai': '\n\n[去AI味后：减少了常见的AI表达模式，增加了个人风格]',
          conflict: '\n\n[强化冲突后：增加了角色之间的矛盾和张力]',
          detail: '\n\n[增加细节后：丰富了场景描写和感官细节]',
        }
        setTextContent((prev) => prev + (prefixes[action] || '\n\n[处理完成]'))
        toast.success(`处理完成（演示模式）`)
      }
    } catch {
      toast.error('处理失败')
    } finally {
      setRefining(false)
    }
  }

  const handleContextMenuAction = (action: string) => {
    const selection = window.getSelection()?.toString()
    if (!selection) {
      toast.error('请先选择文本')
      return
    }
    handleToolbarAction(action)
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
            生成
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
