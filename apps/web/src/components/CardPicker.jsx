import { X } from 'lucide-react'

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS = ['s', 'h', 'd', 'c']
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_TEXT_COLOR = { s: 'text-neutral-200', c: 'text-neutral-200', h: 'text-red-400', d: 'text-red-400' }

export default function CardPicker({ usedCards, onPick, onClear, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-200">Pick a card</p>
          <div className="flex items-center gap-3">
            <button onClick={onClear} className="text-xs font-medium text-neutral-500 hover:text-neutral-200">
              Clear
            </button>
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {SUITS.map((suit) => (
            <div key={suit} className="flex gap-1.5">
              {RANKS.map((rank) => {
                const card = rank + suit
                const disabled = usedCards.has(card)
                return (
                  <button
                    key={card}
                    disabled={disabled}
                    onClick={() => onPick(card)}
                    className={`flex-1 rounded-md border py-1.5 text-xs font-semibold transition ${
                      disabled
                        ? 'cursor-not-allowed border-neutral-850 bg-neutral-950 text-neutral-800'
                        : `border-neutral-700 bg-neutral-800 hover:border-amber-400/60 ${SUIT_TEXT_COLOR[suit]}`
                    }`}
                  >
                    {rank === 'T' ? '10' : rank}
                    {SUIT_SYMBOLS[suit]}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
