'use client'

import Goals from '@/screens/Goals'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function GoalsPage() {
  const { onXP } = useAppRuntime()
  return <Goals onXP={onXP} />
}
