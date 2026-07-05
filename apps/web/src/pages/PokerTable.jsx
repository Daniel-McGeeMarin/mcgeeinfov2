import { useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, Loader2, RotateCcw } from 'lucide-react'
import PlayingCard from '../components/PlayingCard'
import CardPicker from '../components/CardPicker'
import { getPokerEquity } from '../api'

const BOARD_LABELS = ['Flop', 'Flop', 'Flop', 'Turn', 'River']

export default function PokerTable() {
  const [hero, setHero] = useState([null, null])
  const [board, setBoard] = useState([null, null, null, null, null])
  const [opponents, setOpponents] = useState(2)
  const [activeSlot, setActiveSlot] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const usedCards = new Set([...hero, ...board].filter(Boolean))

  const filledBoard = []
  for (const c of board) {
    if (c) filledBoard.push(c)
    else break
  }
  const boardValid = [0, 3, 4, 5].includes(filledBoard.length)
  const canCalculate = hero[0] && hero[1] && boardValid && !loading

  function openSlot(group, index) {
    setActiveSlot({ group, index })
  }

  function pickCard(card) {
    if (activeSlot.group === 'hero') {
      const next = [...hero]
      next[activeSlot.index] = card
      setHero(next)
    } else {
      const next = [...board]
      next[activeSlot.index] = card
      setBoard(next)
    }
    setActiveSlot(null)
  }

  function clearSlot() {
    if (activeSlot.group === 'hero') {
      const next = [...hero]
      next[activeSlot.index] = null
      setHero(next)
    } else {
      const next = [...board]
      next[activeSlot.index] = null
      setBoard(next)
    }
    setActiveSlot(null)
  }

  function reset() {
    setHero([null, null])
    setBoard([null, null, null, null, null])
    setOpponents(2)
    setResult(null)
    setError(null)
  }

  async function calculate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await getPokerEquity({ hero, board: filledBoard, opponents, trials: 4000 })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-3xl px-6 py-10 lg:py-12"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Poker Odds Simulator</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Monte Carlo hand-equity — set your hand and the board, see your win rate.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-100"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="relative mt-8 rounded-[3rem] border-4 border-amber-900/40 bg-gradient-to-b from-emerald-800 to-emerald-950 px-6 pb-14 pt-8 shadow-2xl">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-emerald-200/60">
          Board
        </p>
        <div className="flex justify-center gap-2">
          {board.map((card, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <PlayingCard card={card} onClick={() => openSlot('board', i)} />
              {!card && <span className="text-[10px] text-emerald-200/40">{BOARD_LABELS[i]}</span>}
            </div>
          ))}
        </div>

        <div className="absolute left-1/2 -bottom-8 flex -translate-x-1/2 flex-col items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Your hand</span>
          <div className="flex gap-2">
            <PlayingCard card={hero[0]} onClick={() => openSlot('hero', 0)} />
            <PlayingCard card={hero[1]} onClick={() => openSlot('hero', 1)} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">Opponents</span>
          <div className="flex items-center gap-2 rounded-full border border-neutral-800 px-1.5 py-1">
            <button
              onClick={() => setOpponents((n) => Math.max(1, n - 1))}
              className="rounded-full p-1 text-neutral-400 hover:text-neutral-100"
            >
              <Minus size={14} />
            </button>
            <span className="w-4 text-center text-sm font-medium text-neutral-100">{opponents}</span>
            <button
              onClick={() => setOpponents((n) => Math.min(8, n + 1))}
              className="rounded-full p-1 text-neutral-400 hover:text-neutral-100"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={!canCalculate}
          className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Calculate odds
        </button>
      </div>

      {!boardValid && (
        <p className="mt-2 text-xs text-neutral-600">Board must be filled left-to-right: 3 (flop), 4 (turn), or 5 (river) cards.</p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Your win probability</p>
          <p className="mt-1 text-4xl font-bold text-amber-300">{(result.equities[0] * 100).toFixed(1)}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${result.equities[0] * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">vs {opponents} random opponent{opponents > 1 ? 's' : ''} · 4,000 simulated hands</p>
        </motion.div>
      )}

      {activeSlot && (
        <CardPicker usedCards={usedCards} onPick={pickCard} onClear={clearSlot} onClose={() => setActiveSlot(null)} />
      )}
    </motion.div>
  )
}
