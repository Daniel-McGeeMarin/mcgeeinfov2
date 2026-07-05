import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Circle } from 'lucide-react'

export default function WebAppCard({ app, index }) {
  const isLive = app.status === 'live'

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle
            size={8}
            className={isLive ? 'fill-emerald-400 text-emerald-400 animate-pulse' : 'fill-neutral-700 text-neutral-700'}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {isLive ? 'Live demo' : 'Coming soon'}
          </span>
        </div>
        {isLive && <ArrowUpRight size={16} className="text-neutral-500 transition group-hover:text-amber-300" />}
      </div>
      <h3 className="mt-3 text-base font-semibold text-neutral-100">{app.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-neutral-400">{app.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {app.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-500"
          >
            {tag}
          </span>
        ))}
        {app.noAI && (
          <span
            title="Backend written entirely by hand, no AI assistance"
            className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[11px] font-medium text-violet-300"
          >
            No AI · hand-coded
          </span>
        )}
      </div>
    </>
  )

  const className = `group relative block overflow-hidden rounded-2xl border p-5 transition ${
    isLive
      ? 'border-amber-400/30 bg-gradient-to-br from-amber-400/[0.07] to-transparent hover:border-amber-400/60'
      : 'border-neutral-800 bg-neutral-900/40 opacity-70'
  }`

  const motionProps = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.4, delay: (index % 6) * 0.05 },
  }

  if (isLive) {
    return (
      <motion.div {...motionProps}>
        <Link to={app.href} className={className}>
          {inner}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div {...motionProps} className={className}>
      {inner}
    </motion.div>
  )
}
