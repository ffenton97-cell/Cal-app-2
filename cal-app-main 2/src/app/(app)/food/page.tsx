'use client'

import Food from '@/screens/Food'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function FoodPage() {
  const { onXP } = useAppRuntime()
  return <Food onXP={onXP} />
}
