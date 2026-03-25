'use client'

import CheckIn from '@/screens/CheckIn'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function HomePage() {
  const { onXP } = useAppRuntime()
  return <CheckIn onXP={onXP} />
}
