import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Loader2 } from 'lucide-react'
import { saveSession } from './api'

export default function SubmitModal({ open, onClose, challengeId, session }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      const { session_id } = await saveSession(name, challengeId, session)
      const url = `${window.location.origin}/apps/modelfit?session=${session_id}`
      setLink(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setName('')
    setLink(null)
    setCopied(false)
    setError(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-sm mx-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-neutral-100">Share with professor</h2>
              <button onClick={handleClose} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <X size={18} />
              </button>
            </div>

            {!link ? (
              <>
                <p className="text-sm text-neutral-400 mb-4">
                  Enter your name so your professor knows whose results these are (optional).
                </p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition-colors mb-4"
                />
                {error && (
                  <p className="text-xs text-red-400 mb-3">{error}</p>
                )}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-white transition-colors disabled:opacity-60"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Generate link
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-400 mb-3">
                  Copy this link and send it to your professor.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 pl-3 pr-1 py-1 mb-4">
                  <span className="flex-1 text-xs text-neutral-400 font-mono truncate">{link}</span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 flex items-center gap-1 rounded-md bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1.5 text-xs font-medium text-neutral-200 transition-colors"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full rounded-lg border border-neutral-800 py-2 text-sm text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
