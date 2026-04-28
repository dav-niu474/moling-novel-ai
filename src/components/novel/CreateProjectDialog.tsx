'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: (project: any) => void
}

const genres = [
  { value: 'xuanhuan', label: '玄幻' },
  { value: 'xianxia', label: '仙侠' },
  { value: 'urban', label: '都市' },
  { value: 'scifi', label: '科幻' },
  { value: 'history', label: '历史' },
  { value: 'wuxia', label: '武侠' },
  { value: 'games', label: '游戏' },
  { value: 'sports', label: '体育' },
  { value: 'suspense', label: '悬疑' },
  { value: 'romance', label: '言情' },
  { value: 'fantasy', label: '奇幻' },
  { value: 'military', label: '军事' },
  { value: 'other', label: '其他' },
]

export function CreateProjectDialog({ open, onOpenChange, onProjectCreated }: CreateProjectDialogProps) {
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [chapterCount, setChapterCount] = useState('30')
  const [wordsPerChapter, setWordsPerChapter] = useState('3000')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入项目标题')
      return
    }
    if (!genre) {
      toast.error('请选择小说类型')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          genre,
          description: description.trim(),
          chapterCount: parseInt(chapterCount) || 30,
          wordsPerChapter: parseInt(wordsPerChapter) || 3000,
        }),
      })
      if (res.ok) {
        const project = await res.json()
        onProjectCreated(project)
        resetForm()
      } else {
        toast.error('创建项目失败')
      }
    } catch {
      toast.error('创建项目失败')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setGenre('')
    setDescription('')
    setChapterCount('30')
    setWordsPerChapter('3000')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-stone-800 dark:text-stone-200">
            创建新项目
          </DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-stone-400">
            填写基本信息，开始你的网文创作之旅
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-stone-700 dark:text-stone-300">
              小说标题 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="输入你的小说标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre" className="text-stone-700 dark:text-stone-300">
              小说类型 <span className="text-red-500">*</span>
            </Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="border-amber-200 dark:border-stone-600">
                <SelectValue placeholder="选择类型..." />
              </SelectTrigger>
              <SelectContent>
                {genres.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-stone-700 dark:text-stone-300">
              简介
            </Label>
            <Textarea
              id="description"
              placeholder="简要描述你的小说概念..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="border-amber-200 dark:border-stone-600 focus:border-amber-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chapterCount" className="text-stone-700 dark:text-stone-300">
                计划章数
              </Label>
              <Input
                id="chapterCount"
                type="number"
                min="1"
                max="500"
                value={chapterCount}
                onChange={(e) => setChapterCount(e.target.value)}
                className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wordsPerChapter" className="text-stone-700 dark:text-stone-300">
                每章字数
              </Label>
              <Input
                id="wordsPerChapter"
                type="number"
                min="500"
                max="10000"
                step="500"
                value={wordsPerChapter}
                onChange={(e) => setWordsPerChapter(e.target.value)}
                className="border-amber-200 dark:border-stone-600 focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={creating}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建项目
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
