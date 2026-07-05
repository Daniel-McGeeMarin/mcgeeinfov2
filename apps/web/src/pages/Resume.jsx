import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { profile } from '../content'

export default function Resume() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-4xl px-6 py-10 lg:py-14"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-100">Resume</h1>
        <a
          href={profile.resumeUrl}
          download
          className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300"
        >
          <Download size={15} strokeWidth={2.5} />
          Download
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <iframe
          src={profile.resumeUrl}
          title="Dan McGee-Marin's resume"
          className="h-[80vh] w-full"
        />
      </div>
    </motion.div>
  )
}
