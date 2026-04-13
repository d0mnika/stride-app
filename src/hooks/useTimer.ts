'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createTimer, formatTime } from '@/lib/timer'
import type { Timer, TimerState, TimerOptions } from '@/lib/timer'

export interface UseTimerReturn {
  state: TimerState
  formattedRemaining: string
  formattedElapsed: string
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  finish: () => void
}

export function useTimer(options: TimerOptions = {}): UseTimerReturn {
  // Store options in a ref so callbacks always see the latest version
  // without triggering a timer recreation.
  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })

  const timerRef = useRef<Timer | null>(null)

  const [state, setState] = useState<TimerState>(() => ({
    status: 'idle',
    elapsedSec: 0,
    remainingSec: options.durationSec ?? 25 * 60,
    durationSec: options.durationSec ?? 25 * 60,
  }))

  // Build the timer instance once per hook mount.
  useEffect(() => {
    const timer = createTimer({
      durationSec: optionsRef.current.durationSec,
      onTick(s) {
        setState(s)
        optionsRef.current.onTick?.(s)
      },
      onComplete(s) {
        setState(s)
        optionsRef.current.onComplete?.(s)
      },
    })
    timerRef.current = timer

    return () => timer.stop()
  }, []) // intentionally empty — recreate only on unmount/remount

  const start   = useCallback(() => { timerRef.current?.start();  setState(t => timerRef.current?.getState() ?? t) }, [])
  const pause   = useCallback(() => { timerRef.current?.pause();  setState(t => timerRef.current?.getState() ?? t) }, [])
  const resume  = useCallback(() => { timerRef.current?.resume(); setState(t => timerRef.current?.getState() ?? t) }, [])
  const stop    = useCallback(() => { timerRef.current?.stop();   setState(t => timerRef.current?.getState() ?? t) }, [])
  const finish  = useCallback(() => { timerRef.current?.finish(); setState(t => timerRef.current?.getState() ?? t) }, [])

  return {
    state,
    formattedRemaining: formatTime(state.remainingSec),
    formattedElapsed:   formatTime(state.elapsedSec),
    start,
    pause,
    resume,
    stop,
    finish,
  }
}
