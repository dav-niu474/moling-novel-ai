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

      // Simulate generation progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 500)

      const res = await fetch('/api/architecture/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, coreSeed }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (res.ok) {
        const data = await res.json()
        setArchitecture(data)
        toast.success('架构生成完成')
      } else {
        // Fallback to demo data
        setArchitecture({
          coreSeed,
          characterDynamics: '主角与反派之间存在亦敌亦友的关系，二人在追求同一目标的过程中不断碰撞与融合。配角群体围绕核心冲突形成多维度的人际网络，既有利益同盟也有价值对立。',
          worldviewFramework: '以修真体系为核心的世界架构，灵气复苏带来社会结构重塑。凡人与修者之间的矛盾构成社会张力，各大宗门势力角逐形成政治格局。',
          plotArchitecture: '三幕式结构：启程(1-10章)→成长(11-25章)→决战(26-30章)。第一幕建立世界观与核心矛盾，第二幕推进角色成长与势力角逐，第三幕汇聚所有伏笔完成高潮与收束。',
          rhythmPoints: [
            { chapter: 1, intensity: 60, label: '开篇引入' },
            { chapter: 5, intensity: 75, label: '第一冲突' },
            { chapter: 10, intensity: 85, label: '转折点' },
            { chapter: 15, intensity: 70, label: '低谷期' },
            { chapter: 20, intensity: 80, label: '二次冲突' },
            { chapter: 25, intensity: 90, label: '高潮预演' },
            { chapter: 30, intensity: 100, label: '最终高潮' },
          ],
        })
        toast.success('架构生成完成（演示模式）')
      }
    } catch {
      // Fallback to demo data on error
      setArchitecture({
        coreSeed,
        characterDynamics: '主角与反派之间存在亦敌亦友的关系，二人在追求同一目标的过程中不断碰撞与融合。配角群体围绕核心冲突形成多维度的人际网络。',
        worldviewFramework: '以修真体系为核心的世界架构，灵气复苏带来社会结构重塑。凡人与修者之间的矛盾构成社会张力。',
        plotArchitecture: '三幕式结构：启程(1-10章)→成长(11-25章)→决战(26-30章)。第一幕建立世界观与核心矛盾，第二幕推进角色成长与势力角逐。',
        rhythmPoints: [
          { chapter: 1, intensity: 60, label: '开篇引入' },
          { chapter: 5, intensity: 75, label: '第一冲突' },
          { chapter: 10, intensity: 85, label: '转折点' },
          { chapter: 15, intensity: 70, label: '低谷期' },
          { chapter: 20, intensity: 80, label: '二次冲突' },
          { chapter: 25, intensity: 90, label: '高潮预演' },
          { chapter: 30, intensity: 100, label: '最终高潮' },
        ],
      })
      toast.success('架构生成完成（演示模式）')
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
                  生成中...
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
