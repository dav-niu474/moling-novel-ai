'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Paintbrush, Expand, Wand2, Swords, FileText, MessageSquare, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface RefinePanelProps {
  projectId: string
}

const actions = [
  { key: 'polish', label: '润色', icon: Paintbrush, desc: '优化文字表达，使行文更加流畅自然' },
  { key: 'expand', label: '扩写', icon: Expand, desc: '扩展段落，增加细节描写和内心独白' },
  { key: 'de-ai', label: '去AI味', icon: Wand2, desc: '去除AI痕迹，增加个人风格和真实感' },
  { key: 'conflict', label: '强化冲突', icon: Swords, desc: '增强角色间的矛盾和戏剧张力' },
  { key: 'detail', label: '增加细节', icon: FileText, desc: '丰富场景描写和感官细节' },
  { key: 'dialogue', label: '完善对话', icon: MessageSquare, desc: '优化人物对话，增强角色个性' },
]

export function RefinePanel({ projectId }: RefinePanelProps) {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const handleAction = async (actionKey: string) => {
    if (!inputText.trim()) {
      toast.error('请输入需要处理的文本')
      return
    }

    try {
      setProcessing(true)
      setActiveAction(actionKey)

      const res = await fetch('/api/chapter-contents/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action: actionKey, content: inputText }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.content) {
          setOutputText(data.content)
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
      setProcessing(false)
      setActiveAction(null)
    }
  }

  const handleApplyToChapter = () => {
    if (outputText) {
      setInputText(outputText)
      setOutputText('')
      toast.success('已应用到输入区域，可继续处理或复制到章节中')
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-200">文本润色</h2>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {actions.map((action) => {
          const Icon = action.icon
          const isActive = activeAction === action.key
          return (
            <Button
              key={action.key}
              variant="outline"
              onClick={() => handleAction(action.key)}
              disabled={processing}
              className={`
                h-auto py-3 flex flex-col items-center gap-1.5
                ${isActive
                  ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-amber-200 dark:border-stone-600 hover:bg-amber-50 dark:hover:bg-stone-800'
                }
              `}
            >
              {processing && isActive ? (
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              ) : (
                <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{action.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Input / Output Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <FileText className="w-4 h-4 text-amber-500" />
              原文
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="粘贴或输入需要润色的文本..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={12}
              className="border-amber-200 dark:border-stone-600 focus:border-amber-400 resize-none text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-stone-400">{inputText.length} 字</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 dark:border-stone-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-stone-700 dark:text-stone-300">
                <Sparkles className="w-4 h-4 text-amber-500" />
                处理结果
              </CardTitle>
              {outputText && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyToChapter}
                  className="h-6 text-xs border-amber-200 dark:border-stone-600"
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  应用到输入
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[240px] p-3 rounded-md border border-amber-100 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800/30">
              {processing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-stone-500 dark:text-stone-400">AI正在处理文本...</p>
                  </div>
                </div>
              ) : outputText ? (
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">{outputText}</p>
              ) : (
                <p className="text-sm text-stone-400 dark:text-stone-500">处理结果将显示在这里</p>
              )}
            </div>
            {outputText && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-stone-400">{outputText.length} 字</span>
                <Button
                  size="sm"
                  className="h-6 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(outputText)
                    toast.success('已复制到剪贴板')
                  }}
                >
                  复制
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
