'use client'

import Todos from '@/screens/Todos'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function TodosPage() {
  const { onXP } = useAppRuntime()
  return <Todos onXP={onXP} />
}
