import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clipboard, RotateCcw, SkipForward, AlarmClock, Moon } from 'lucide-react'
import { parseSchedule } from '../lib/scheduleParser'
import { AI_MINUTES_PROMPT } from '../lib/aiPrompt'
import { warmUpAudio, playAlarm } from '../lib/beep'

const EXAMPLE = `5 minutes opening discussion
10 minutes main topic
3 minutes questions`

const ORIGINAL_TITLE = document.title

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function SessionTimer() {
  const [rawText, setRawText] = useState(() => localStorage.getItem('session-timer-text') ?? '')
  const [copyLabel, setCopyLabel] = useState('Copy AI prompt')

  const [phase, setPhase] = useState('setup') // setup | running | ringing | done
  const [segments, setSegments] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [endTime, setEndTime] = useState(null)
  const [snoozeCount, setSnoozeCount] = useState(0)
  const [now, setNow] = useState(Date.now())

  const parsedLines = parseSchedule(rawText)
  const validSegments = parsedLines.filter((l) => l.valid)
  const hasErrors = parsedLines.some((l) => !l.valid)
  const canStart = validSegments.length > 0 && !hasErrors

  useEffect(() => {
    localStorage.setItem('session-timer-text', rawText)
  }, [rawText])

  // Countdown tick
  useEffect(() => {
    if (phase !== 'running') return
    const interval = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase === 'running' && endTime && now >= endTime) {
      setPhase('ringing')
    }
  }, [now, phase, endTime])

  // Ringing: repeat the alarm and flash the tab title until acknowledged
  useEffect(() => {
    if (phase !== 'ringing') {
      document.title = ORIGINAL_TITLE
      return
    }
    playAlarm()
    const soundInterval = setInterval(playAlarm, 8000)
    const titleInterval = setInterval(() => {
      document.title = document.title === ORIGINAL_TITLE ? "⏰ Time's up!" : ORIGINAL_TITLE
    }, 1000)
    return () => {
      clearInterval(soundInterval)
      clearInterval(titleInterval)
      document.title = ORIGINAL_TITLE
    }
  }, [phase])

  function startSegment(segs, index) {
    const seg = segs[index]
    if (!seg) {
      setPhase('done')
      return
    }
    setCurrentIndex(index)
    setEndTime(Date.now() + seg.minutes * 60 * 1000)
    setNow(Date.now())
    setPhase('running')
  }

  function handleStart() {
    warmUpAudio()
    setSegments(validSegments)
    setSnoozeCount(0)
    startSegment(validSegments, 0)
  }

  function handleNext() {
    startSegment(segments, currentIndex + 1)
  }

  function handleSnooze() {
    const minutes = snoozeCount < 3 ? 3 : 1
    setSnoozeCount((c) => c + 1)
    setEndTime(Date.now() + minutes * 60 * 1000)
    setNow(Date.now())
    setPhase('running')
  }

  function handleReset() {
    setPhase('setup')
    setSegments([])
    setCurrentIndex(0)
    setEndTime(null)
    setSnoozeCount(0)
  }

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(AI_MINUTES_PROMPT)
    setCopyLabel('Copied!')
    setTimeout(() => setCopyLabel('Copy AI prompt'), 1800)
  }

  if (phase === 'setup') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto max-w-3xl px-6 py-10 lg:py-12"
      >
        <h1 className="text-2xl font-semibold text-neutral-100">Session Timer</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Paste a schedule — meetings, study sessions, whatever has parts and a clock — and run through it
          segment by segment.
        </p>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Schedule</span>
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-100"
          >
            <Clipboard size={13} />
            {copyLabel}
          </button>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={EXAMPLE}
          rows={7}
          className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-400/50 focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-neutral-600">
          One segment per line: <span className="font-mono text-neutral-500">&lt;number&gt; minutes &lt;title&gt;</span>
        </p>

        {parsedLines.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5">
            {parsedLines.map((line) => (
              <div
                key={line.id}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  line.valid
                    ? 'border-neutral-800 bg-neutral-900/40 text-neutral-300'
                    : 'border-red-900/50 bg-red-950/20 text-red-300'
                }`}
              >
                {line.valid ? (
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <X size={15} className="mt-0.5 shrink-0 text-red-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-neutral-500">{line.raw}</p>
                  {line.valid ? (
                    <p className="text-neutral-200">
                      {line.minutes} min — {line.title}
                    </p>
                  ) : (
                    <p className="text-red-400">{line.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="mt-6 w-full rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"
        >
          Start Session
        </button>
      </motion.div>
    )
  }

  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-24 text-center"
      >
        <h1 className="text-2xl font-semibold text-neutral-100">Session complete 🎉</h1>
        <p className="text-sm text-neutral-500">Ran through all {segments.length} segments.</p>
        <button
          onClick={handleReset}
          className="mt-2 flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-neutral-100"
        >
          <RotateCcw size={14} />
          New session
        </button>
      </motion.div>
    )
  }

  // running | ringing
  const seg = segments[currentIndex]
  const totalMs = seg.minutes * 60 * 1000
  const remainingMs = phase === 'ringing' ? 0 : Math.max(0, endTime - now)
  const progress = Math.min(100, ((totalMs - remainingMs) / totalMs) * 100)
  const nextSeg = segments[currentIndex + 1]
  const nextSnoozeMinutes = snoozeCount < 3 ? 3 : 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center"
    >
      <button
        onClick={handleReset}
        className="mb-6 flex items-center gap-1.5 self-end rounded-full border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-200"
      >
        <RotateCcw size={12} />
        End session
      </button>

      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Segment {currentIndex + 1} of {segments.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-neutral-100">{seg.title}</h1>

      <div
        className={`mt-8 flex h-48 w-48 items-center justify-center rounded-full border-4 text-5xl font-bold tabular-nums transition-colors sm:h-56 sm:w-56 ${
          phase === 'ringing'
            ? 'animate-pulse border-red-500 text-red-400'
            : 'border-amber-400/40 text-amber-300'
        }`}
      >
        {phase === 'ringing' ? <AlarmClock size={64} /> : formatTime(remainingMs)}
      </div>

      <div className="mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all ${phase === 'ringing' ? 'bg-red-500' : 'bg-amber-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {nextSeg && <p className="mt-3 text-xs text-neutral-600">Up next: {nextSeg.title}</p>}

      {phase === 'ringing' ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleSnooze}
            className="flex items-center gap-2 rounded-full border border-neutral-700 px-5 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-600"
          >
            <Moon size={15} />
            Snooze {nextSnoozeMinutes}m
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300"
          >
            Next segment
          </button>
        </div>
      ) : (
        <button
          onClick={handleNext}
          className="mt-8 flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-200"
        >
          <SkipForward size={13} />
          Skip to next
        </button>
      )}
    </motion.div>
  )
}
