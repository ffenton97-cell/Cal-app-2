'use client'

import Desk from '@/screens/Desk'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function DeskPage() {
  const { onXP } = useAppRuntime()
  return <Desk onXP={onXP} />
}
