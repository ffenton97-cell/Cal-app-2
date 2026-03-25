'use client'

import Outbound from '@/screens/Outbound'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function OutboundPage() {
  const { onXP } = useAppRuntime()
  return <Outbound onXP={onXP} />
}
