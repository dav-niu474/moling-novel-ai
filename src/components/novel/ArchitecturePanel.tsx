'use client'

import { useState } from 'react'
import { Sparkles, Loader2, BookOpen, Users, Globe, GitBranch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface ArchitecturePanelProps {
  projectId: string
  project: {
    id: string
    title: string
    genre: string
    description: string
    chapterCount: number
    wordsPerChapter: number
    coreSeed: string
    status: string
  }
}

interface ArchitectureData {
  coreSeed: string
  characterDynamics: string
  worldviewFramework: string
  plotArchitecture: string
  rhythmPoints: { chapter: number; intensity: number; label: string }[]
}

export function ArchitecturePanel({ projectId, project }: ArchitecturePanelProps) {
  const [coreSeed, setCoreSeed] = useState(project.coreSeed || '')
  const [architecture, setArchitecture] = useState<ArchitectureData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleGenerate = async () => {
    if (!coreSeed.trim()) {
      toast.error('请先输入核心种子')
      return
    }

    try {
      setGenerating(true)
      setProgress(0)

      // Save coreSeed first
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreSeed }),
      })

      // Progress indicator for AI generation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 10
        })
      }, 800)

      const res = await fetch('/api/architecture/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, coreSeed }),
      })

      if (!res.ok) {
        clearInterval(progressInterval)
        const errorData = await res.json().catch(() => null)
        toast.error(errorData?.error || '架构生成失败，请稍后重试')
        return
      }

      // Handle streaming response
      const contentType = res.headers.get('Content-Type') || ''
      const chapterCount = Number(res.headers.get('X-Architecture-ChapterCount') || project.chapterCount)

      if (contentType.includes('text/plain')) {
        // Streaming response - collect full text and parse
        const reader = res.body?.getReader()
        if (!reader) {
          toast.error('架构生成失败：无法读取流')
          return
        }

        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          // Update progress based on content length
          setProgress(Math.min(50 + fullText.length / 50, 95))
        }

        clearInterval(progressInterval)
        setProgress(100)

        // Parse the collected JSON text
        try {
          let cleaned = fullText.trim()
          // Remove thinking tags
          cleaned = cleaned.replace(/<think[\s\S]*?<\/think>/gi, '')
          cleaned = cleaned.replace(/<thinking[\s\S]*?<\/thinking>/gi, '')
          cleaned = cleaned.trim()
          // Remove markdown code blocks
          if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
          else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
          if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
          cleaned = cleaned.trim()

          // Extract JSON
          const jsonStart = cleaned.indexOf('{')
          if (jsonStart >= 0) {
            cleaned = cleaned.slice(jsonStart)
          }

          const architecture = JSON.parse(cleaned)

          // Transform to frontend-expected format
          const characterDynamics = architecture.characters
            ? architecture.characters
                .map((c: any) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation} | 弧线：${c.arc}`)
                .join('\n')
            : ''

          const worldviewFramework = architecture.worldSettings
            ? architecture.worldSettings
                .map((ws: any) => `${ws.name}（${ws.category}）：${ws.description}`)
                .join('\n')
            : ''

          const plotArchitecture = architecture.plotStructure
            ? `开局设定（前${Math.floor(chapterCount * 0.1)}章）：${architecture.plotStructure.setup}\n` +
              `上升行动（第${Math.floor(chapterCount * 0.1) + 1}-${Math.floor(chapterCount * 0.5)}章）：${architecture.plotStructure.risingAction}\n` +
              `中点转折（约第${Math.floor(chapterCount * 0.5)}章）：${architecture.plotStructure.midpoint}\n` +
              `下降行动（第${Math.floor(chapterCount * 0.5) + 1}-${Math.floor(chapterCount * 0.8)}章）：${architecture.plotStructure.fallingAction}\n` +
              `高潮（第${Math.floor(chapterCount * 0.8) + 1}-${Math.floor(chapterCount * 0.9)}章）：${architecture.plotStructure.climax}\n` +
              `结局（第${Math.floor(chapterCount * 0.9) + 1}-${chapterCount}章）：${architecture.plotStructure.resolution}`
            : ''

          const rhythmPoints = [
            { chapter: 1, intensity: 60, label: '开篇引入' },
            { chapter: Math.floor(chapterCount * 0.1), intensity: 70, label: '初遇挑战' },
            { chapter: Math.floor(chapterCount * 0.25), intensity: 75, label: '冲突升级' },
            { chapter: Math.floor(chapterCount * 0.5), intensity: 90, label: '中点转折' },
            { chapter: Math.floor(chapterCount * 0.65), intensity: 70, label: '低谷蓄力' },
            { chapter: Math.floor(chapterCount * 0.8), intensity: 85, label: '二次冲突' },
            { chapter: Math.floor(chapterCount * 0.9), intensity: 95, label: '高潮预演' },
            { chapter: chapterCount, intensity: 100, label: '最终高潮' },
          ]

          setArchitecture({
            coreSeed: architecture.coreSeed || coreSeed,
            characterDynamics,
            worldviewFramework,
            plotArchitecture,
            rhythmPoints,
          })
          toast.success('架构生成完成')
        } catch (parseError) {
          console.error('Failed to parse architecture:', parseError)
          toast.error('架构生成格式异常，请重试')
        }
      } else {
        // Non-streaming JSON response (backward compatibility)
        clearInterval(progressInterval)
        setProgress(100)
        const data = await res.json()
        setArchitecture(data)
        toast.success('架构生成完成')
      }
    } catch {
      toast.error('架构生成失败，请检查网络连接后重试')
    } finally {
      setGenerating(false)
    }
  }

  const renderRhythmCurve = () => {
    if (!architecture?.rhythmPoints?.length) return null

    const points = architecture.rhythmPoints
    const width = 600
    const height = 200
    const padding = 40
    const chartW = width - padding * 2
    const chartH = height - padding * 2

    const getX = (i: number) => padding + (i / (points.length - 1)) * chartW
    const getY = (intensity: number) => padding + chartH - (intensity / 100) * chartH

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.intensity)}`)
      .join(' ')

    const areaPath = `${pathData} L ${getX(points.length - 1)} ${padding + chartH} L ${padding} ${padding + chartH} Z`

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={padding}
              y1={getY(v)}
              x2={width - padding}
              y2={getY(v)}
              stroke="currentColor"
              className="text-stone-200 dark:text-stone-700"
              strokeDasharray="4 4"
            />
            <text x={padding - 8} y={getY(v) + 4} textAnchor="end" className="fill-stone-400 dark:fill-stone-500 text-[10px]">
              {v}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} className="fill-amber-200/30 dark:fill-amber-800/20" />

        {/* Line */}
        <path d={pathData} fill="none" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(p.intensity)} r="4" className="fill-amber-500 dark:fill-amber-400" />
            <text x={getX(i)} y={getY(p.intensity) - 12} textAnchor="middle" className="fill-stone-600 dark:fill-stone-300 text-[9px] font-medium">
              {p.label}
            </text>
            <text x={getX(i)} y={padding + chartH + 16} textAnchor="middle" className="fill-stone-400 dark:fill-stone-500 text-[10px]">
              第{p.chapter}章
            </text>
          </g>
        ))}
      </svg>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">小说架构</h2>
      </div>

      {/* Core Seed Input */}
      <Card className="border-amber-100 dark:border-stone-700 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-stone-700 dark:text-stone-300">
            <BookOpen className="w-4 h-4 text-amber-500" />
            核心种子
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="描述你的小说核心概念... 例如：一个少年意外获得上古传承，在修真世界中发现自己的身世之谜，肩负起拯救两界使命的故事。"
            value={coreSeed}
            onChange={(e) => setCoreSeed(e.target.value)}
            rows={4}
            className="border-amber-200 dark:border-stone-600 focus:border-amber-400 resize-none mb-3"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI正在生成架构...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成架构
                </>
              )}
            </Button>
            {generating && (
              <div className="flex-1 max-w-xs">
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Architecture Results */}
      {architecture && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Character Dynamics */}
            <Card className="border-amber-100 dark:border-stone-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
                  <Users className="w-4 h-4 text-amber-500" />
                  角色动力学
                  <Badge variant="outline" className="ml-auto text-xs border-amber-200 dark:border-stone-600">
                    已生成
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {architecture.characterDynamics}
                </p>
              </CardContent>
            </Card>

            {/* Worldview Framework */}
            <Card className="border-amber-100 dark:border-stone-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
                  <Globe className="w-4 h-4 text-amber-500" />
                  世界观框架
                  <Badge variant="outline" className="ml-auto text-xs border-amber-200 dark:border-stone-600">
                    已生成
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {architecture.worldviewFramework}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Plot Architecture */}
          <Card className="border-amber-100 dark:border-stone-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
                <GitBranch className="w-4 h-4 text-amber-500" />
                情节架构
                <Badge variant="outline" className="ml-auto text-xs border-amber-200 dark:border-stone-600">
                  已生成
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                {architecture.plotArchitecture}
              </p>
            </CardContent>
          </Card>

          {/* Rhythm Curve */}
          <Card className="border-amber-100 dark:border-stone-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
                📊 节奏曲线
                <Badge variant="outline" className="ml-auto text-xs border-amber-200 dark:border-stone-600">
                  情绪强度
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderRhythmCurve()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!architecture && !generating && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-stone-800 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-400 dark:text-amber-500" />
          </div>
          <h3 className="text-base font-medium text-stone-600 dark:text-stone-400">输入核心种子以生成架构</h3>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            描述你的小说核心概念，AI将为你生成角色动力学、世界观框架、情节架构和节奏曲线
          </p>
        </div>
      )}
    </div>
  )
}
