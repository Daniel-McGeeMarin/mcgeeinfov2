import { motion } from 'framer-motion'
import { Trophy, RotateCcw, Share2 } from 'lucide-react'
import { MODEL_COLORS } from './useFitSession'

const MODEL_LABELS = { linear: 'Linear', quadratic: 'Quadratic', exponential: 'Exponential' }

const GRADE_STYLES = {
  A: 'text-green-400 bg-green-400/10 border-green-400/30',
  B: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  C: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  D: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  F: 'text-red-400 bg-red-400/10 border-red-400/30',
}

function ScoreCard({ type, score, isBest, delay }) {
  const color = MODEL_COLORS[type]
  const pct = Math.max(0, Math.min(100, score.r2 * 100))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={[
        'rounded-xl border p-4 relative',
        isBest ? 'border-neutral-600 bg-neutral-800/60' : 'border-neutral-800 bg-neutral-900/40',
      ].join(' ')}
    >
      {isBest && (
        <div className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] font-semibold text-neutral-200">
          <Trophy size={9} /> Best fit
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-neutral-200">{MODEL_LABELS[type]}</span>
        </div>
        <span className={`text-lg font-bold px-2 py-0.5 rounded-md border ${GRADE_STYLES[score.grade]}`}>
          {score.grade}
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-neutral-800 mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.15, duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="flex justify-between text-xs text-neutral-500">
        <span>R² = {score.r2.toFixed(3)}</span>
        <span>MSE = {score.mse.toFixed(2)}</span>
      </div>
    </motion.div>
  )
}

export default function ScoreReveal({ scores, bestModel, onReset, onShare }) {
  if (!scores) return null

  const order = ['linear', 'quadratic', 'exponential']

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">Results</p>
        <p className="text-sm text-neutral-400">
          Test data revealed — <span className="text-neutral-200">{MODEL_LABELS[bestModel]}</span> model generalised best
        </p>
      </motion.div>

      <div className="flex flex-col gap-3">
        {order.filter(t => scores[t]).map((type, i) => (
          <ScoreCard
            key={type}
            type={type}
            score={scores[type]}
            isBest={type === bestModel}
            delay={i * 0.12}
          />
        ))}
      </div>

      <div className="mt-1 text-xs text-neutral-600 text-center leading-relaxed">
        R² measures how well your model explains the variance in the data (1 = perfect). The yellow points are the hidden test data.
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-800 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-100 hover:border-neutral-700 transition-colors"
        >
          <RotateCcw size={13} /> Try again
        </button>
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-neutral-100 py-2 text-xs font-semibold text-neutral-950 hover:bg-white transition-colors"
        >
          <Share2 size={13} /> Share results
        </button>
      </div>
    </div>
  )
}
