import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { compile } from 'mathjs'
import { MODEL_COLORS } from './useFitSession'
import 'mathlive'

const CONFIG = {
  linear: {
    label: 'Linear',
    description: 'A straight line: y = ax + b',
  },
  quadratic: {
    label: 'Quadratic',
    description: 'A parabola: y = ax² + bx + c',
  },
  exponential: {
    label: 'Exponential',
    description: 'Exponential growth/decay: y = a·eˢˣ',
  },
}

function validate(expr) {
  if (!expr.trim()) return true
  try {
    const fn = compile(expr)
    const v = fn.evaluate({ x: 1 })
    return typeof v === 'number' && isFinite(v)
  } catch {
    return false
  }
}

export default function ModelPanel({ type, model, onExprChange, onToggleVisibility, disabled, theme }) {
  const cfg = CONFIG[type]
  const color = MODEL_COLORS[type]
  const [error, setError] = useState(false)
  const mfRef = useRef(null)
  const isDark = theme !== 'light'

  // Set up input listener on mount
  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    mf.mathVirtualKeyboardPolicy = 'off'

    const onInput = () => {
      const val = mf.getValue('ascii-math')
      onExprChange(type, val)
      setError(!validate(val))
    }

    mf.addEventListener('input', onInput)
    return () => mf.removeEventListener('input', onInput)
  }, [type, onExprChange])

  // Sync external value into math-field (challenge switch, localStorage load)
  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    const cur = mf.getValue('ascii-math')
    if (cur !== model.expr) {
      mf.setValue(model.expr, { format: 'ascii-math' })
    }
    setError(!validate(model.expr))
  }, [model.expr])

  // Sync read-only state
  useEffect(() => {
    const mf = mfRef.current
    if (mf) mf.readOnly = !!disabled
  }, [disabled])

  return (
    <div
      className="rounded-xl border p-4 transition-colors"
      style={{
        borderColor: model.visible ? `${color}33` : (isDark ? '#27272a' : '#e5e5e5'),
        backgroundColor: model.visible ? `${color}08` : 'transparent',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: model.visible ? color : (isDark ? '#52525b' : '#a3a3a3') }}
          />
          <span className={`text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
            {cfg.label}
          </span>
        </div>
        <button
          onClick={() => onToggleVisibility(type)}
          disabled={disabled}
          className={`transition-colors disabled:opacity-40 ${
            isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-700'
          }`}
          title={model.visible ? 'Hide curve' : 'Show curve'}
        >
          {model.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>

      <p className={`text-xs mb-2 ${isDark ? 'text-neutral-600' : 'text-neutral-500'}`}>
        {cfg.description}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-sm font-mono shrink-0 text-neutral-500">y =</span>
        <div
          className={`flex-1 rounded-lg border overflow-hidden ${
            error && model.expr.trim()
              ? 'border-red-500/60'
              : isDark ? 'border-neutral-800' : 'border-neutral-300'
          }`}
        >
          {/* eslint-disable-next-line react/no-unknown-property */}
          <math-field
            ref={mfRef}
            style={{
              display: 'block',
              width: '100%',
              padding: '4px 10px',
              fontSize: '14px',
              background: isDark ? '#18181b' : '#f9f9f9',
              '--math-font-color': isDark ? '#f5f5f5' : '#171717',
              '--keyboard-background': isDark ? '#262626' : '#f0f0f0',
            }}
          />
        </div>
      </div>

      {error && model.expr.trim() && (
        <p className="mt-1.5 text-xs text-red-400/80">Invalid expression</p>
      )}
    </div>
  )
}
