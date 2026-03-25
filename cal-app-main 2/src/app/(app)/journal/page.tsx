'use client'

import Journal from '@/screens/Journal'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function JournalPage() {
  const { onXP } = useAppRuntime()
  return <Journal onXP={onXP} />
}
