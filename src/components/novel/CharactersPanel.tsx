'use client'

import { useEffect, useState } from 'react'
import { Plus, Sparkles, Loader2, ChevronDown, ChevronUp, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Character {
  id: string
  name: string
  role: string
  personality: string
  motivation: string
  arc: string
  relationships: string
  appearance: string
  background: string
  order: number
}

const roleMap: Record<string, { label: string; color: string }> = {
  protagonist: { label: '主角', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  antagonist: { label: '反派', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  supporting: { label: '配角', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  minor: { label: '龙套', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
}

interface CharactersPanelProps {
  projectId: string
}

export function CharactersPanel({ projectId }: CharactersPanelProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formPersonality, setFormPersonality] = useState('')
  const [formMotivation, setFormMotivation] = useState('')
  const [formAppearance, setFormAppearance] = useState('')
  const [formBackground, setFormBackground] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCharacters()
  }, [projectId])

  const fetchCharacters = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/characters?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setCharacters(data)
      }
    } catch {
      toast.error('加载角色失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCharacter = async () => {
    if (!formName.trim()) {
      toast.error('请输入角色名称')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: formName.trim(),
          role: formRole || 'supporting',
          personality: formPersonality.trim(),
          motivation: formMotivation.trim(),
          appearance: formAppearance.trim(),
          background: formBackground.trim(),
        }),
      })
      if (res.ok) {
        const newChar = await res.json()
        setCharacters((prev) => [...prev, newChar])
        setDialogOpen(false)
        resetForm()
        toast.success('角色创建成功')
      }
    } catch {
      toast.error('创建角色失败')
    } finally {
      setCreating(false)
    }
  }

  const handleAIGenerate = async () => {
    try {
      setGenerating(true)
      const res = await fetch('/api/characters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (res.ok) {
        const newChars = await res.json()
        setCharacters((prev) => [...prev, ...newChars])
        toast.success(`AI生成了 ${newChars.length} 个角色`)
      } else {
        // Fallback demo
        const demoChars: Character[] = [
          {
            id: `demo-${Date.now()}-1`,
            name: '林逸',
            role: 'protagonist',
            personality: '坚毅果敢，内心善良但外表冷漠。面对困境从不退缩，但常常独自承担一切。',
            motivation: '寻找身世真相，保护身边的人',
            arc: '从孤僻少年成长为承担责任的一方之主',
            relationships: '与苏瑶互为知己，与萧寒亦敌亦友',
            appearance: '身材修长，眉目英挺，眼神深邃如星空，常着青色长衫',
            background: '自幼在山村长大，不知自己的真实身份',
            order: 0,
          },
          {
            id: `demo-${Date.now()}-2`,
            name: '苏瑶',
            role: 'supporting',
            personality: '温柔聪慧，心思细腻。表面柔弱，实则内心极有主见。',
            motivation: '解开家族诅咒，守护林逸',
            arc: '从受保护的千金小姐到独当一面的强者',
            relationships: '与林逸互为知己，是萧寒的师妹',
            appearance: '容貌清丽脱俗，眉间一点朱砂，常着白色衣裙',
            background: '大家族出身，但家族背负着神秘诅咒',
            order: 1,
          },
          {
            id: `demo-${Date.now()}-3`,
            name: '萧寒',
            role: 'antagonist',
            personality: '野心勃勃，城府极深。表面温文尔雅，实则冷酷无情。',
            motivation: '追求绝对力量，改变现有秩序',
            arc: '从天才少年走向极端的复仇之路',
            relationships: '与林逸亦敌亦友，是苏瑶的师兄',
            appearance: '面容俊朗，但笑意不达眼底，常着玄色长袍',
            background: '幼年被灭门，被宗门收养后成为天才弟子',
            order: 2,
          },
        ]
        setCharacters((prev) => [...prev, ...demoChars])
        toast.success('AI生成了 3 个角色（演示模式）')
      }
    } catch {
      toast.error('AI生成角色失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteCharacter = async (id: string) => {
    try {
      const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== id))
        toast.success('角色已删除')
      }
    } catch {
      toast.error('删除角色失败')
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormRole('')
    setFormPersonality('')
    setFormMotivation('')
    setFormAppearance('')
    setFormBackground('')
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">角色管理</h2>
          <Badge variant="outline" className="text-xs border-amber-200 dark:border-stone-600">
            {characters.length} 个角色
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAIGenerate}
            disabled={generating}
            className="border-amber-200 dark:border-stone-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-stone-800"
          >
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI生成角色
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加角色
          </Button>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-stone-800 flex items-center justify-center">
            <User className="w-8 h-8 text-amber-400 dark:text-amber-500" />
          </div>
          <h3 className="text-base font-medium text-stone-600 dark:text-stone-400">暂无角色</h3>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            手动添加角色，或让AI根据核心种子自动生成角色群像
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {characters.map((char) => {
            const role = roleMap[char.role] || roleMap.supporting
            const isExpanded = expandedId === char.id
            return (
              <Collapsible
                key={char.id}
                open={isExpanded}
                onOpenChange={(open) => setExpandedId(open ? char.id : null)}
              >
                <Card className="border-amber-100 dark:border-stone-700 hover:border-amber-300 dark:hover:border-stone-500 transition-colors">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 px-4 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-stone-700 dark:to-stone-600 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-400">
                            {char.name[0]}
                          </div>
                          <div>
                            <CardTitle className="text-base text-stone-800 dark:text-stone-200">{char.name}</CardTitle>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                              {char.personality || '暂无性格描述'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${role.color}`}>{role.label}</Badge>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-stone-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-stone-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-amber-100 dark:border-stone-700 pt-3">
                        {char.motivation && (
                          <div>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">动机</p>
                            <p className="text-sm text-stone-700 dark:text-stone-300">{char.motivation}</p>
                          </div>
                        )}
                        {char.arc && (
                          <div>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">角色弧</p>
                            <p className="text-sm text-stone-700 dark:text-stone-300">{char.arc}</p>
                          </div>
                        )}
                        {char.appearance && (
                          <div>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">外貌</p>
                            <p className="text-sm text-stone-700 dark:text-stone-300">{char.appearance}</p>
                          </div>
                        )}
                        {char.background && (
                          <div>
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">背景</p>
                            <p className="text-sm text-stone-700 dark:text-stone-300">{char.background}</p>
                          </div>
                        )}
                        {char.relationships && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">关系</p>
                            <p className="text-sm text-stone-700 dark:text-stone-300">{char.relationships}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDeleteCharacter(char.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}

      {/* Create Character Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-stone-800 dark:text-stone-200">添加角色</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-stone-400">
              创建新的角色，丰富你的小说人物群像
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-stone-700 dark:text-stone-300">角色名称 *</Label>
                <Input
                  placeholder="输入角色名称"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="border-amber-200 dark:border-stone-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-stone-700 dark:text-stone-300">角色定位</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger className="border-amber-200 dark:border-stone-600">
                    <SelectValue placeholder="选择定位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protagonist">主角</SelectItem>
                    <SelectItem value="antagonist">反派</SelectItem>
                    <SelectItem value="supporting">配角</SelectItem>
                    <SelectItem value="minor">龙套</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-stone-700 dark:text-stone-300">性格特征</Label>
              <Textarea
                placeholder="描述角色的性格特点..."
                value={formPersonality}
                onChange={(e) => setFormPersonality(e.target.value)}
                rows={2}
                className="border-amber-200 dark:border-stone-600 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-stone-700 dark:text-stone-300">动机</Label>
              <Input
                placeholder="角色的核心动机..."
                value={formMotivation}
                onChange={(e) => setFormMotivation(e.target.value)}
                className="border-amber-200 dark:border-stone-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-stone-700 dark:text-stone-300">外貌</Label>
              <Input
                placeholder="角色的外貌描述..."
                value={formAppearance}
                onChange={(e) => setFormAppearance(e.target.value)}
                className="border-amber-200 dark:border-stone-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-stone-700 dark:text-stone-300">背景</Label>
              <Textarea
                placeholder="角色的背景故事..."
                value={formBackground}
                onChange={(e) => setFormBackground(e.target.value)}
                rows={2}
                className="border-amber-200 dark:border-stone-600 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleCreateCharacter}
              disabled={creating}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
