'use client'

import { useEffect, useState, useCallback } from 'react'
import { Settings, Loader2, Key, Globe, Cpu, Thermometer, Hash, Save, Info, CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface ProviderModel {
  id: string
  name: string
  maxTokens?: number
}

interface ProviderInfo {
  id: string
  name: string
  baseUrl: string
  models: ProviderModel[]
  defaultModel: string
  apiKeyPrefix: string
  description: string
}

interface AISettingsData {
  id: string
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  hasApiKey: boolean
  providers: ProviderInfo[]
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<AISettingsData | null>(null)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [provider, setProvider] = useState('nvidia')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://integrate.api.nvidia.com/v1')
  const [model, setModel] = useState('deepseek-ai/deepseek-r1')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(8192)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
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
          setProviders(data.providers || [])
          setProvider(data.provider || 'nvidia')
          setApiKey('') // Don't prefill API key for security
          setBaseUrl(data.baseUrl || 'https://integrate.api.nvidia.com/v1')
          setModel(data.model || 'deepseek-ai/deepseek-r1')
          setTemperature(data.temperature ?? 0.7)
          setMaxTokens(data.maxTokens || 8192)
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleProviderChange = useCallback((newProvider: string) => {
    setProvider(newProvider)
    setTestResult(null)
    const providerConfig = providers.find((p) => p.id === newProvider)
    if (providerConfig) {
      if (newProvider !== 'custom' && newProvider !== 'builtin') {
        setBaseUrl(providerConfig.baseUrl)
      }
      if (providerConfig.models.length > 0) {
        setModel(providerConfig.defaultModel)
      }
    }
  }, [providers])

  const handleSave = async () => {
    try {
      setSaving(true)
      setTestResult(null)
      const res = await fetch('/api/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey || undefined, // Only send if user entered a new one
          baseUrl,
          model,
          temperature,
          maxTokens,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setProviders(data.providers || [])
        toast.success('设置已保存')
      } else {
        const errorData = await res.json().catch(() => null)
        toast.error(errorData?.error || '保存设置失败')
      }
    } catch {
      toast.error('保存设置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (provider === 'builtin') {
      setTestResult({ success: true, message: '内置模型无需测试，开箱即用' })
      return
    }

    if (!apiKey && !(settings?.hasApiKey)) {
      setTestResult({ success: false, message: '请先输入 API 密钥' })
      return
    }

    try {
      setTesting(true)
      setTestResult(null)

      // Save first, then test
      const saveRes = await fetch('/api/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey || undefined,
          baseUrl,
          model,
          temperature: 0.3,
          maxTokens: 50,
        }),
      })

      if (!saveRes.ok) {
        setTestResult({ success: false, message: '保存设置失败，无法测试' })
        return
      }

      // Test by generating a simple response
      const testRes = await fetch('/api/chapter-contents/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'polish',
          content: '这是一个测试。',
        }),
      })

      if (testRes.ok) {
        setTestResult({ success: true, message: '连接成功！AI 模型响应正常' })
      } else {
        const errorData = await testRes.json().catch(() => null)
        setTestResult({
          success: false,
          message: errorData?.error || 'AI 模型连接失败，请检查配置',
        })
      }
    } catch {
      setTestResult({ success: false, message: '网络错误，请检查连接' })
    } finally {
      setTesting(false)
    }
  }

  const currentProvider = providers.find((p) => p.id === provider)
  const currentModels = currentProvider?.models || []

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
        {/* Provider Selection */}
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Zap className="w-4 h-4 text-amber-500" />
              模型供应商
            </CardTitle>
            <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
              选择AI模型供应商，不同供应商提供不同的模型和价格
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="border-amber-200 dark:border-stone-600">
                <SelectValue placeholder="选择供应商" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.id === 'nvidia' && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          推荐
                        </Badge>
                      )}
                      {p.id === 'builtin' && (
                        <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          免配置
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentProvider && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/50 dark:bg-stone-800/50">
                <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {currentProvider.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Key - Hidden for builtin */}
        {provider !== 'builtin' && (
          <Card className="border-amber-100 dark:border-stone-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
                <Key className="w-4 h-4 text-amber-500" />
                API 密钥
                {settings?.hasApiKey && !apiKey && (
                  <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ml-1">
                    已配置
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={
                    settings?.hasApiKey
                      ? '已保存密钥，留空则保持不变'
                      : currentProvider?.apiKeyPrefix
                        ? `输入API密钥，通常以 ${currentProvider.apiKeyPrefix} 开头`
                        : '输入API密钥'
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
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
                你的API密钥将安全地存储在数据库中，不会发送到第三方服务
              </p>
            </CardContent>
          </Card>
        )}

        {/* Base URL */}
        {provider !== 'builtin' && (
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
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={provider !== 'custom'}
                className="border-amber-200 dark:border-stone-600 focus:border-amber-400 disabled:opacity-70"
              />
              {provider !== 'custom' && (
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
                  切换到"自定义"供应商可修改此地址
                </p>
              )}
              {provider === 'custom' && (
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
                  支持任何 OpenAI 兼容的 API 地址，如 OneAPI、New API 等中转服务
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Model Selection */}
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Cpu className="w-4 h-4 text-amber-500" />
              模型
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentModels.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="border-amber-200 dark:border-stone-600">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {currentModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{m.name}</span>
                        {m.maxTokens && (
                          <span className="text-[10px] text-stone-400">
                            {m.maxTokens >= 1024 ? `${Math.round(m.maxTokens / 1024)}K` : m.maxTokens} tokens
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : provider === 'custom' ? (
              <Input
                placeholder="输入模型名称，如 gpt-4o"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
              />
            ) : provider === 'builtin' ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50/50 dark:bg-stone-800/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  使用平台内置模型，无需选择
                </p>
              </div>
            ) : (
              <Input
                placeholder="输入模型名称"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
              />
            )}
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
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={2}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400 w-10 text-right">
                {temperature.toFixed(1)}
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
              max={200000}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 8192)}
              className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
            />
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
              每次AI生成的最大Token数量，影响生成文本的长度。建议网文创作设置为 8192 或更高
            </p>
          </CardContent>
        </Card>

        {/* Test Result */}
        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {testResult.success
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            }
            <p className={`text-xs ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {testResult.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            保存设置
          </Button>
          <Button
            onClick={handleTest}
            disabled={testing || saving}
            variant="outline"
            className="border-amber-200 dark:border-stone-600"
          >
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            测试连接
          </Button>
        </div>

        {/* Quick Setup Guide */}
        <Card className="border-amber-100 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Info className="w-4 h-4 text-amber-500" />
              快速配置指南
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-stone-500 dark:text-stone-400 space-y-1.5">
              <p><strong className="text-stone-700 dark:text-stone-300">NVIDIA NIM (推荐)</strong>：免费使用，注册 <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 underline">build.nvidia.com</a> 获取 API Key</p>
              <p><strong className="text-stone-700 dark:text-stone-300">DeepSeek</strong>：中文能力强，访问 <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 underline">platform.deepseek.com</a> 获取 API Key</p>
              <p><strong className="text-stone-700 dark:text-stone-300">通义千问</strong>：阿里云模型，访问 <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 underline">dashscope.console.aliyun.com</a> 获取 API Key</p>
              <p><strong className="text-stone-700 dark:text-stone-300">内置模型</strong>：无需任何配置，开箱即用，适合快速体验</p>
              <Separator className="my-2" />
              <p className="text-stone-400 dark:text-stone-500">💡 推荐网文创作使用 DeepSeek R1 或通义千问 Plus，中文创作能力出色</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
