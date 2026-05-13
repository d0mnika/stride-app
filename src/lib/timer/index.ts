// Pure TypeScript timer state machine — no React, no Supabase.
// Can be unit-tested standalone and run inside a service worker.
//
// Usage:
//   const timer = createTimer({ durationSec: 25 * 60, onTick, onComplete })
//   timer.start()
//   timer.pause()
//   timer.resume()
//   timer.stop()   // abandons session
//   timer.finish() // completes session (early or at natural end)

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed' | 'stopped'

export interface TimerState {
  status: TimerStatus
  elapsedSec: number      // total seconds the timer has been running (pause excluded)
  remainingSec: number    // seconds left in the current duration
  durationSec: number     // total planned duration
}

export interface TimerOptions {
  /** Total session length in seconds (default: 25 min). */
  durationSec?: number
  /** Called every second while running. Receives current state snapshot. */
  onTick?: (state: TimerState) => void
  /** Called when the timer reaches zero naturally. */
  onComplete?: (state: TimerState) => void
}

export interface Timer {
  start: () => void
  pause: () => void
  resume: () => void
  /** Ends and discards the session. */
  stop: () => void
  /** Ends and saves the session (can be called before natural completion). */
  finish: () => void
  getState: () => TimerState
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTimer(options: TimerOptions = {}): Timer {
  const durationSec = options.durationSec ?? 25 * 60

  let status: TimerStatus = 'idle'
  let accumulatedSec = 0         // elapsed before the current running segment
  let segmentStartMs: number | null = null  // wall-clock start of current segment
  let intervalId: ReturnType<typeof setInterval> | null = null

  function computeElapsedSec(): number {
    if (segmentStartMs === null) return accumulatedSec
    return accumulatedSec + (Date.now() - segmentStartMs) / 1000
  }

  function snapshot(): TimerState {
    const elapsedSec = Math.floor(computeElapsedSec())
    return {
      status,
      elapsedSec,
      remainingSec: Math.max(0, durationSec - elapsedSec),
      durationSec,
    }
  }

  function tick() {
    const elapsedSec = Math.floor(computeElapsedSec())
    options.onTick?.({ status, elapsedSec, remainingSec: Math.max(0, durationSec - elapsedSec), durationSec })

    if (elapsedSec >= durationSec) {
      clearTick()
      accumulatedSec = durationSec
      segmentStartMs = null
      status = 'completed'
      options.onComplete?.(snapshot())
    }
  }

  function clearTick() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return {
    start() {
      if (status !== 'idle') return
      status = 'running'
      segmentStartMs = Date.now()
      intervalId = setInterval(tick, 1000)
    },

    pause() {
      if (status !== 'running') return
      accumulatedSec = Math.floor(computeElapsedSec())
      segmentStartMs = null
      status = 'paused'
      clearTick()
    },

    resume() {
      if (status !== 'paused') return
      status = 'running'
      segmentStartMs = Date.now()
      intervalId = setInterval(tick, 1000)
    },

    stop() {
      accumulatedSec = Math.floor(computeElapsedSec())
      segmentStartMs = null
      clearTick()
      status = 'stopped'
    },

    finish() {
      accumulatedSec = Math.floor(computeElapsedSec())
      segmentStartMs = null
      clearTick()
      status = 'completed'
      options.onComplete?.(snapshot())
    },

    getState: snapshot,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a total number of seconds as "MM:SS". */
export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
