import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X } from 'lucide-react'

const STEPS = [
  {
    title: "Welcome to Model Fitter",
    body: "Your goal is to fit three different mathematical models to a real dataset. You'll see which one generalises best to hidden test data.",
  },
  {
    title: "The scatter plot",
    body: "The white dots are your training data — the points you'll use to fit your models. Pan and zoom with your mouse to explore.",
  },
  {
    title: "Type your equations",
    body: "Each model panel has an equation input. Type any valid expression using x — for example: 2*x + 3, or 0.5*x^2, or 3*e^(0.2*x). The curve updates live as you type.",
  },
  {
    title: "Toggle model visibility",
    body: "Use the eye icon on each panel to hide or show individual curves. This helps you focus on one model at a time without losing your work on the others.",
  },
  {
    title: "Check your fit",
    body: "When you're happy with all three models, click \"Check My Fit\". Hidden test data is revealed and each model is scored on how well it generalises.",
  },
]

export default function Tutorial({ onDone }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-5 bg-neutral-300' : i < step ? 'w-2 bg-neutral-600' : 'w-2 bg-neutral-800'
                }`}
              />
            ))}
          </div>
          <button onClick={onDone} className="text-neutral-600 hover:text-neutral-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <h2 className="text-base font-semibold text-neutral-100 mb-2">{current.title}</h2>
        <p className="text-sm text-neutral-400 leading-relaxed mb-6">{current.body}</p>

        <div className="flex gap-2">
          <button
            onClick={onDone}
            className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            Skip tutorial
          </button>
          <button
            onClick={isLast ? onDone : () => setStep(s => s + 1)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white transition-colors"
          >
            {isLast ? "Let's go" : 'Next'}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
