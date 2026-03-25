'use client'

import Finance from '@/screens/Finance'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function FinancePage() {
  const { onXP } = useAppRuntime()
  return <Finance onXP={onXP} />
}
