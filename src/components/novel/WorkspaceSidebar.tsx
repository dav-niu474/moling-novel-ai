'use client'

import {
  LayoutDashboard,
  Users,
  Globe,
  List,
  PenTool,
  Sparkles,
  Download,
  Settings,
  ArrowLeft,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useAppStore, type TabType } from '@/lib/store'

const navItems: { tab: TabType; icon: React.ElementType; label: string; emoji: string }[] = [
  { tab: 'architecture', icon: LayoutDashboard, label: '架构', emoji: '📋' },
  { tab: 'characters', icon: Users, label: '角色', emoji: '🎭' },
  { tab: 'worldview', icon: Globe, label: '世界观', emoji: '🌍' },
  { tab: 'outline', icon: List, label: '大纲', emoji: '📑' },
  { tab: 'writing', icon: PenTool, label: '写作', emoji: '✍️' },
  { tab: 'refine', icon: Sparkles, label: '润色', emoji: '🔧' },
  { tab: 'export', icon: Download, label: '导出', emoji: '📤' },
  { tab: 'settings', icon: Settings, label: '设置', emoji: '⚙️' },
]

export function WorkspaceSidebar() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setTab = useAppStore((s) => s.setTab)
  const navigateToHome = useAppStore((s) => s.navigateToHome)

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-full w-14 sm:w-16 flex flex-col items-center py-3 bg-stone-50 dark:bg-stone-900 border-r border-amber-100 dark:border-stone-700">
        {/* Logo */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 shadow-md">
          <span className="text-white font-bold text-sm">墨</span>
        </div>

        <Separator className="w-8 mb-2 bg-amber-200 dark:bg-stone-700" />

        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col items-center gap-1 py-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.tab
            const Icon = item.icon
            return (
              <Tooltip key={item.tab}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTab(item.tab)}
                    className={`
                      w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center
                      transition-all duration-200 group relative
                      ${
                        isActive
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md'
                          : 'text-stone-500 dark:text-stone-400 hover:bg-amber-100 dark:hover:bg-stone-800 hover:text-amber-700 dark:hover:text-amber-400'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] w-1 h-5 bg-amber-500 rounded-r-full" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.emoji} {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        <Separator className="w-8 mb-2 bg-amber-200 dark:bg-stone-700" />

        {/* Back Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={navigateToHome}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            ← 返回
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
