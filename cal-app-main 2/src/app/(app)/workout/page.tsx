'use client'

import Workout from '@/screens/Workout'
import { useAppRuntime } from '@/contexts/AppRuntimeContext'

export default function WorkoutPage() {
  const { onXP } = useAppRuntime()
  return <Workout onXP={onXP} />
}
