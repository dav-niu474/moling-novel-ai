'use client'

import { useEffect, useState } from 'react'
import { Settings, Loader2, Key, Globe, Cpu, Thermometer, Hash, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface AISettingsData {
  id: string
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

const models = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'qwen-turbo', label: '通义千问 Turbo' },
  { value: 'qwen-plus', label: '通义千问 Plus' },
]

export function SettingsPanel() {
  const [settings, setSettings] = useState<AISettingsData>({
    id: '',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/ai-settings')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setSettings(data)
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast.success('设置已保存')
      } else {
        toast.error('保存设置失败')
      }
    } catch {
      toast.error('保存设置失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-amber-100 dark:border-stone-700">
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="h-10 bg-stone-100 dark:bg-stone-800 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">AI 设置</h2>
      </div>

      <div className="space-y-4">
        {/* API Key */}
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Key className="w-4 h-4 text-amber-500" />
              API 密钥
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={settings.apiKey}
                onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
                className="border-amber-200 dark:border-stone-600 shrink-0"
              >
                {showApiKey ? '隐藏' : '显示'}
              </Button>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
              你的API密钥将安全地存储在本地，不会发送到第三方服务
            </p>
          </CardContent>
        </Card>

        {/* Base URL */}
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Globe className="w-4 h-4 text-amber-500" />
              API 地址
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://api.openai.com/v1"
              value={settings.baseUrl}
              onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
              className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
            />
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
              支持OpenAI兼容的API地址，可使用代理或第三方服务
            </p>
          </CardContent>
        </Card>

        {/* Model */}
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Cpu className="w-4 h-4 text-amber-500" />
              模型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.model}
              onValueChange={(v) => setSettings((s) => ({ ...s, model: v }))}
            >
              <SelectTrigger className="border-amber-200 dark:border-stone-600">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Thermometer className="w-4 h-4 text-amber-500" />
              温度 (Temperature)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.temperature]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, temperature: v }))}
                min={0}
                max={2}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400 w-10 text-right">
                {settings.temperature.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-stone-400 dark:text-stone-500 mt-2">
              <span>精确 (0)</span>
              <span>平衡 (0.7)</span>
              <span>创意 (2.0)</span>
            </div>
          </CardContent>
        </Card>

        {/* Max Tokens */}
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Hash className="w-4 h-4 text-amber-500" />
              最大 Token 数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min={256}
              max={128000}
              step={256}
              value={settings.maxTokens}
              onChange={(e) => setSettings((s) => ({ ...s, maxTokens: parseInt(e.target.value) || 4096 }))}
              className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
            />
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
              每次AI生成的最大Token数量，影响生成文本的长度
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存设置
        </Button>
      </div>
    </div>
  )
}
