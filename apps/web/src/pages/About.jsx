import { motion } from 'framer-motion'
import { about } from '../content'

export default function About() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-3xl px-6 py-10 lg:py-14"
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <img
          src={about.image}
          alt="Dan"
          className="h-32 w-32 shrink-0 rounded-2xl object-cover ring-1 ring-neutral-800 sm:h-40 sm:w-40"
        />
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">About Me</h1>
          <div className="mt-4 flex flex-col gap-4">
            {about.paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-neutral-400">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Recent interests
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {about.interests.map((item) => (
            <span
              key={item}
              className="rounded-full border border-neutral-800 bg-neutral-900/40 px-3 py-1 text-xs font-medium text-neutral-300"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
