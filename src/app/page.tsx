'use client'

import { useAppStore } from '@/lib/store'
import { ProjectList } from '@/components/novel/ProjectList'
import { ProjectWorkspace } from '@/components/novel/ProjectWorkspace'

export default function Home() {
  const currentView = useAppStore((s) => s.currentView)

  return currentView === 'workspace' ? <ProjectWorkspace /> : <ProjectList />
}
