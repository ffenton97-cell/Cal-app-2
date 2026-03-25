'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

export type XPHandlerPayload = {
  amount?: number
  achievement?: unknown
}

type AppRuntimeValue = {
  onXP: (p: XPHandlerPayload) => void
}

const AppRuntimeContext = createContext<AppRuntimeValue | null>(null)

export function AppRuntimeProvider({
  children,
  onXPFloat,
  onAchievement,
}: {
  children: ReactNode
  onXPFloat: (amount: number) => void
  onAchievement: (achievement: unknown) => void
}) {
  const onXP = useCallback(
    ({ amount, achievement: ach }: XPHandlerPayload) => {
      if (amount) onXPFloat(amount)
      if (ach) onAchievement(ach)
    },
    [onXPFloat, onAchievement],
  )

  const value = useMemo(() => ({ onXP }), [onXP])

  return (
    <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>
  )
}

export function useAppRuntime() {
  const ctx = useContext(AppRuntimeContext)
  if (!ctx) {
    throw new Error('useAppRuntime must be used within AppRuntimeProvider')
  }
  return ctx
}
