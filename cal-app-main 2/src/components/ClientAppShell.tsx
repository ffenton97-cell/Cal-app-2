'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Header from '@/components/Header'
import StorageBanner from '@/components/StorageBanner'
import Nav from '@/components/Nav'
import ChatPanel from '@/components/ChatPanel'
import AchievementOverlay from '@/components/AchievementOverlay'
import CloudSyncManager from '@/components/CloudSyncManager'
import XPFloat from '@/components/XPFloat'
import { AppRuntimeProvider } from '@/contexts/AppRuntimeContext'
import { seedIfNeeded } from '@/seed'

export default function ClientAppShell({ children }: { children: ReactNode }) {
  const [xpFloat, setXpFloat] = useState<{ amount: number } | null>(null)
  const [achievement, setAchievement] = useState<unknown>(null)
  const [operatorOpen, setOperatorOpen] = useState(false)

  useEffect(() => {
    void seedIfNeeded().catch((err) =>
      console.error('[FORGE] Seed failed, continuing anyway:', err),
    )
  }, [])

  return (
    <AppRuntimeProvider
      onXPFloat={(amount) => setXpFloat({ amount })}
      onAchievement={(ach) => setAchievement(ach)}
    >
      <div className="flex h-[100dvh] max-h-[100dvh] min-h-[-webkit-fill-available] flex-row overflow-hidden bg-realm-bg text-realm-text">
        <CloudSyncManager />
        <Nav onOpenOperator={() => setOperatorOpen(true)} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <StorageBanner />
          <Header />

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)]">
            {children}
          </main>
        </div>

        {xpFloat && (
          <XPFloat amount={xpFloat.amount} onDone={() => setXpFloat(null)} />
        )}
        {achievement != null && (
          <AchievementOverlay
            achievement={achievement}
            onDone={() => setAchievement(null)}
          />
        )}
        <ChatPanel open={operatorOpen} onClose={() => setOperatorOpen(false)} />
      </div>
    </AppRuntimeProvider>
  )
}
