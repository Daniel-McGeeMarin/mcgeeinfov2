import { X } from 'lucide-react'

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS = ['s', 'h', 'd', 'c']
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_TEXT_COLOR = { s: 'text-neutral-200', c: 'text-neutral-200', h: 'text-red-400', d: 'text-red-400' }

export default function CardPicker({ usedCards, onPick, onClear, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-lg font-semibold text-neutral-200">Pick a card</p>
          <div className="flex items-center gap-5">
            <button onClick={onClear} className="text-sm font-medium text-neutral-500 hover:text-neutral-200">
              Clear
            </button>
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-x-auto">
          {SUITS.map((suit) => (
            <div key={suit} className="flex gap-2">
              {RANKS.map((rank) => {
                const card = rank + suit
                const disabled = usedCards.has(card)
                return (
                  <button
                    key={card}
                    disabled={disabled}
                    onClick={() => onPick(card)}
                    className={`flex-1 rounded-lg border py-3 text-sm font-semibold transition sm:text-base ${
                      disabled
                        ? 'cursor-not-allowed border-neutral-850 bg-neutral-950 text-neutral-800'
                        : `border-neutral-700 bg-neutral-800 hover:border-amber-400/60 hover:bg-neutral-750 ${SUIT_TEXT_COLOR[suit]}`
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
