const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_COLOR = { s: 'text-neutral-900', c: 'text-neutral-900', h: 'text-red-600', d: 'text-red-600' }

export default function PlayingCard({ card, placeholder = '+', onClick, small = false }) {
  const rankChar = card?.[0]
  const suitChar = card?.[1]
  const rankDisplay = rankChar === 'T' ? '10' : rankChar
  const size = small ? 'h-16 w-11' : 'h-20 w-14'

  if (!card) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center justify-center rounded-lg border-2 border-dashed border-white/25 bg-white/5 text-white/30 transition hover:border-amber-300/60 hover:text-amber-300/70 ${size}`}
      >
        <span className="text-lg">{placeholder}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border border-neutral-200 bg-white shadow-md transition hover:-translate-y-0.5 ${SUIT_COLOR[suitChar]} ${size}`}
    >
      <span className={`font-bold leading-none ${small ? 'text-sm' : 'text-lg'}`}>{rankDisplay}</span>
      <span className={small ? 'text-base leading-none' : 'text-xl leading-none'}>{SUIT_SYMBOLS[suitChar]}</span>
    </button>
  )
}
