'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Plus, Loader2, Globe, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface WorldSetting {
  id: string
  category: string
  name: string
  description: string
  rules: string
  order: number
}

const categories = [
  { value: 'geography', label: '地理', icon: '🗺️' },
  { value: 'culture', label: '文化', icon: '🎭' },
  { value: 'power-system', label: '力量体系', icon: '⚡' },
  { value: 'history', label: '历史', icon: '📜' },
  { value: 'faction', label: '势力', icon: '🏰' },
  { value: 'technology', label: '科技', icon: '🔬' },
  { value: 'economy', label: '经济', icon: '💰' },
  { value: 'general', label: '其他', icon: '📌' },
]

interface WorldviewPanelProps {
  projectId: string
}

export function WorldviewPanel({ projectId }: WorldviewPanelProps) {
  const [settings, setSettings] = useState<WorldSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [formCategory, setFormCategory] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formRules, setFormRules] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [projectId])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/world-settings?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch {
      toast.error('加载世界观设定失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSetting = async () => {
    if (!formName.trim() || !formCategory) {
      toast.error('请填写名称和分类')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/world-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          category: formCategory,
          name: formName.trim(),
          description: formDescription.trim(),
          rules: formRules.trim(),
        }),
      })
      if (res.ok) {
        const newSetting = await res.json()
        setSettings((prev) => [...prev, newSetting])
        setDialogOpen(false)
        resetForm()
        toast.success('设定创建成功')
      }
    } catch {
      toast.error('创建设定失败')
    } finally {
      setCreating(false)
    }
  }

  const handleAIGenerate = async () => {
    try {
      setGenerating(true)
      const res = await fetch('/api/world-settings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (res.ok) {
        const newSettings = await res.json()
        setSettings((prev) => [...prev, ...newSettings])
        toast.success(`AI生成了 ${newSettings.length} 条世界观设定`)
      } else {
        // Demo fallback
        const demoSettings: WorldSetting[] = [
          { id: `demo-${Date.now()}-1`, category: 'geography', name: '灵气大陆', description: '整片大陆被灵气覆盖，不同区域灵气浓度差异极大，形成独特的生态圈。', rules: '灵气浓度从中心向外递减，中心区域为禁地。', order: 0 },
          { id: `demo-${Date.now()}-2`, category: 'power-system', name: '修真境界', description: '炼气→筑基→金丹→元婴→化神→大乘→渡劫，七大境界层层递进。', rules: '每次突破需消耗大量灵石，失败将反噬修为。', order: 1 },
          { id: `demo-${Date.now()}-3`, category: 'faction', name: '天机阁', description: '掌控情报网络的神秘组织，据传能预知天机。', rules: '天机阁弟子不得参与世俗争斗，违者逐出。', order: 2 },
          { id: `demo-${Date.now()}-4`, category: 'culture', name: '修真界礼仪', description: '修真界以实力为尊，但表面礼仪繁复，长幼尊卑严格。', rules: '晚辈见长辈须行叩拜礼，同辈之间以修为高低定座次。', order: 3 },
        ]
        setSettings((prev) => [...prev, ...demoSettings])
        toast.success('AI生成了 4 条世界观设定（演示模式）')
      }
    } catch {
      toast.error('AI生成世界观失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteSetting = async (id: string) => {
    try {
      await fetch(`/api/world-settings/${id}`, { method: 'DELETE' })
      setSettings((prev) => prev.filter((s) => s.id !== id))
      toast.success('设定已删除')
    } catch {
      toast.error('删除设定失败')
    }
  }

  const resetForm = () => {
    setFormCategory('')
    setFormName('')
    setFormDescription('')
    setFormRules('')
  }

  const getGroupedSettings = () => {
    const groups: Record<string, WorldSetting[]> = {}
    settings.forEach((s) => {
      if (!groups[s.category]) groups[s.category] = []
      groups[s.category].push(s)
    })
    return groups
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const grouped = getGroupedSettings()

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">世界观设定</h2>
          <Badge variant="outline" className="text-xs border-amber-200 dark:border-stone-600">
            {settings.length} 条设定
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
            AI生成世界观
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加设定
          </Button>
        </div>
      </div>

      {settings.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-stone-800 flex items-center justify-center">
            <Globe className="w-8 h-8 text-amber-400 dark:text-amber-500" />
          </div>
          <h3 className="text-base font-medium text-stone-600 dark:text-stone-400">暂无世界观设定</h3>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            构建你的小说世界观，或让AI根据核心种子自动生成
          </p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-2">
          {Object.entries(grouped).map(([category, items]) => {
            const catInfo = categories.find((c) => c.value === category) || categories[categories.length - 1]
            return (
              <AccordionItem key={category} value={category} className="border border-amber-100 dark:border-stone-700 rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <span>{catInfo.icon}</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300">{catInfo.label}</span>
                    <Badge variant="outline" className="text-xs border-amber-200 dark:border-stone-600">
                      {items.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pb-2">
                    {items.map((setting) => (
                      <Card key={setting.id} className="border-amber-50 dark:border-stone-700/50 bg-amber-50/30 dark:bg-stone-800/30">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{setting.name}</h4>
                              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">{setting.description}</p>
                              {setting.rules && (
                                <div className="mt-2 p-2 bg-amber-100/50 dark:bg-stone-700/50 rounded-md">
                                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">规则：</p>
                                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">{setting.rules}</p>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-stone-400 hover:text-red-500 shrink-0 ml-2"
                              onClick={() => handleDeleteSetting(setting.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      {/* Create Setting Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-stone-800 dark:text-stone-200">添加世界观设定</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-stone-400">
              为你的小说世界添加新的设定元素
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-stone-700 dark:text-stone-300">分类 *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="border-amber-200 dark:border-stone-600">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-stone-700 dark:text-stone-300">名称 *</Label>
                <Input
                  placeholder="设定名称"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="border-amber-200 dark:border-stone-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-stone-700 dark:text-stone-300">描述</Label>
              <Textarea
                placeholder="详细描述这个设定..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="border-amber-200 dark:border-stone-600 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-stone-700 dark:text-stone-300">规则/法则</Label>
              <Textarea
                placeholder="这个设定的特定规则..."
                value={formRules}
                onChange={(e) => setFormRules(e.target.value)}
                rows={2}
                className="border-amber-200 dark:border-stone-600 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleCreateSetting}
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
