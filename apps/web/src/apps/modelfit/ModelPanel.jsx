import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { compile } from 'mathjs'
import { MODEL_COLORS } from './useFitSession'

const CONFIG = {
  linear: {
    label: 'Linear',
    placeholder: 'e.g. 2*x + 3',
    description: 'A straight line: y = ax + b',
  },
  quadratic: {
    label: 'Quadratic',
    placeholder: 'e.g. 0.5*x^2 - x + 1',
    description: 'A parabola: y = ax² + bx + c',
  },
  exponential: {
    label: 'Exponential',
    placeholder: 'e.g. 3*e^(0.2*x)',
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

export default function ModelPanel({ type, model, onExprChange, onToggleVisibility, disabled }) {
  const cfg = CONFIG[type]
  const color = MODEL_COLORS[type]
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(!validate(model.expr))
  }, [model.expr])

  function handleChange(e) {
    const val = e.target.value
    onExprChange(type, val)
    setError(!validate(val))
  }

  return (
    <div
      className="rounded-xl border p-4 transition-colors"
      style={{
        borderColor: model.visible ? `${color}33` : '#27272a',
        backgroundColor: model.visible ? `${color}08` : 'transparent',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: model.visible ? color : '#52525b' }}
          />
          <span className="text-sm font-semibold text-neutral-200">{cfg.label}</span>
        </div>
        <button
          onClick={() => onToggleVisibility(type)}
          disabled={disabled}
          className="text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-40"
          title={model.visible ? 'Hide curve' : 'Show curve'}
        >
          {model.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>

      <p className="text-xs text-neutral-600 mb-2">{cfg.description}</p>

      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-500 font-mono shrink-0">y =</span>
        <input
          type="text"
          value={model.expr}
          onChange={handleChange}
          disabled={disabled}
          placeholder={cfg.placeholder}
          spellCheck={false}
          className={[
            'flex-1 bg-neutral-900 rounded-lg px-3 py-2 text-sm font-mono outline-none transition-colors',
            'placeholder:text-neutral-700 text-neutral-100',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && model.expr.trim()
              ? 'border border-red-500/60 focus:border-red-500'
              : 'border border-neutral-800 focus:border-neutral-600',
          ].join(' ')}
        />
      </div>

      {error && model.expr.trim() && (
        <p className="mt-1.5 text-xs text-red-400/80">Invalid expression</p>
      )}
    </div>
  )
}
