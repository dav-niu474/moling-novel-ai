'use client'

import { useEffect, useState } from 'react'
import { Download, FileText, FileType, Loader2, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface ExportPanelProps {
  projectId: string
  project: {
    id: string
    title: string
    genre: string
    chapterCount: number
  }
}

interface ChapterExport {
  chapterNumber: number
  title: string
  content: string
  status: string
}

export function ExportPanel({ projectId, project }: ExportPanelProps) {
  const [format, setFormat] = useState<'txt' | 'markdown'>('txt')
  const [chapters, setChapters] = useState<ChapterExport[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState('')
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchChapters()
  }, [projectId])

  const fetchChapters = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/chapter-contents?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setChapters(
          data.map((c: any) => ({
            chapterNumber: c.chapterNumber,
            title: `第${c.chapterNumber}章`,
            content: c.content || '',
            status: c.status,
          }))
        )
      }
    } catch {
      toast.error('加载章节数据失败')
    } finally {
      setLoading(false)
    }
  }

  const generatePreview = () => {
    setGeneratingPreview(true)
    setTimeout(() => {
      let text = ''
      if (format === 'markdown') {
        text += `# ${project.title}\n\n`
        chapters.forEach((ch) => {
          if (ch.content) {
            text += `## ${ch.title}\n\n${ch.content}\n\n---\n\n`
          }
        })
      } else {
        text += `${project.title}\n${'='.repeat(project.title.length * 2)}\n\n`
        chapters.forEach((ch) => {
          if (ch.content) {
            text += `${ch.title}\n${'-'.repeat(20)}\n\n${ch.content}\n\n`
          }
        })
      }
      setPreview(text || '暂无可导出的内容')
      setGeneratingPreview(false)
    }, 500)
  }

  const handleExport = () => {
    if (!preview || preview === '暂无可导出的内容') {
      toast.error('请先生成预览')
      return
    }

    try {
      setExporting(true)
      const blob = new Blob([preview], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.title}.${format === 'markdown' ? 'md' : 'txt'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('导出成功')
    } catch {
      toast.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const completedChapters = chapters.filter((c) => c.content).length
  const totalWords = chapters.reduce((sum, c) => sum + (c.content?.length || 0), 0)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Download className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">导出</h2>
      </div>

      {/* Export Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="border-amber-100 dark:border-stone-700">
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{chapters.length}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">总章节数</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 dark:border-stone-700">
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedChapters}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">已完成</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 dark:border-stone-700">
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalWords.toLocaleString()}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">总字数</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 dark:border-stone-700">
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-stone-600 dark:text-stone-400">
              {chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0}%
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">完成率</p>
          </CardContent>
        </Card>
      </div>

      {/* Format Selection */}
      <Card className="border-amber-100 dark:border-stone-700 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-stone-700 dark:text-stone-300">导出格式</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'txt' | 'markdown')} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="txt" id="txt" />
              <Label htmlFor="txt" className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-stone-500" />
                TXT 纯文本
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="markdown" id="markdown" />
              <Label htmlFor="markdown" className="flex items-center gap-2 cursor-pointer">
                <FileType className="w-4 h-4 text-stone-500" />
                Markdown
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          onClick={generatePreview}
          disabled={generatingPreview || completedChapters === 0}
          className="border-amber-200 dark:border-stone-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-stone-800"
        >
          {generatingPreview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
          生成预览
        </Button>
        <Button
          onClick={handleExport}
          disabled={exporting || !preview || preview === '暂无可导出的内容'}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          导出文件
        </Button>
        {preview && preview !== '暂无可导出的内容' && (
          <Badge variant="outline" className="border-amber-200 dark:border-stone-600">
            {preview.length.toLocaleString()} 字
          </Badge>
        )}
      </div>

      {/* Preview Area */}
      {preview && (
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-700 dark:text-stone-300">预览</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <pre className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap font-serif leading-relaxed p-2">
                {preview}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
