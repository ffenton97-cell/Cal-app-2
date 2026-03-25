'use client'

import BodyComp from '@/screens/BodyComp'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function BodyPage() {
  const { onXP } = useAppRuntime()
  return <BodyComp onXP={onXP} />
}
