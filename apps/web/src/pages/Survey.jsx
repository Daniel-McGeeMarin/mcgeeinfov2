import { useState } from 'react'
import { motion } from 'framer-motion'

const DRIFT_HOW_OPTIONS = [
  { value: 'never', label: "Hasn't happened to me" },
  { value: 'manual_diff', label: 'I manually re-read every diff' },
  { value: 'catch_later', label: 'I catch it later when something breaks' },
  { value: 'own_checks', label: "I've built my own checks/linting for it" },
  { value: 'accumulates', label: "I don't, it just accumulates" },
]

const SEVERITY_OPTIONS = [
  { value: 'never', label: "Doesn't really happen to me" },
  { value: 'small_constant', label: 'Small, constant cost — I catch and correct it in nearly every session' },
  { value: 'occasional', label: 'Occasional bigger incident — hours to a day to fix' },
  { value: 'rare_severe', label: 'Rare but severe — days lost or had to rewrite a module' },
]

function Radio({ name, value, checked, onChange, label }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-neutral-600 group-hover:border-neutral-400 transition-colors">
        {checked && <div className="h-2 w-2 rounded-full bg-neutral-100" />}
      </div>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors leading-snug">
        {label}
      </span>
    </label>
  )
}

function Checkbox({ value, checked, onChange, label }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-600 group-hover:border-neutral-400 transition-colors">
        {checked && (
          <svg className="h-3 w-3 text-neutral-100" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors leading-snug">
        {label}
      </span>
    </label>
  )
}

export default function Survey() {
  const [fullName, setFullName] = useState('')
  const [usesAi, setUsesAi] = useState(null)
  const [driftHow, setDriftHow] = useState([])
  const [severity, setSeverity] = useState([])
  const [wantsResults, setWantsResults] = useState(null)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function toggleDriftHow(val) {
    setDriftHow(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName || null,
          uses_ai: usesAi === 'yes',
          drift_how: usesAi === 'yes' ? driftHow : null,
          drift_severity: usesAi === 'yes' ? (severity.length ? severity : null) : null,
          wants_results: wantsResults === 'yes',
          email: wantsResults === 'yes' ? email || null : null,
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Try again?')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-xl px-6 py-16 text-center"
      >
        <p className="text-lg font-medium text-neutral-100">Thanks — got it.</p>
        <p className="mt-2 text-sm text-neutral-500">Your response has been recorded.</p>
      </motion.div>
    )
  }

  const showFollowUp = usesAi === 'yes'
  const noAi = usesAi === 'no'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-xl px-6 py-10 lg:py-14"
    >
      <h1 className="text-lg font-semibold text-neutral-100">How Do You Handle AI Coding Drift?</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-8">
        {/* Full name */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            Full name <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="—"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-700 outline-none focus:border-neutral-600 transition-colors"
          />
        </div>

        {/* Q1 */}
        <fieldset>
          <legend className="text-sm font-medium text-neutral-200 mb-3">
            1. Do you use AI agents (Cursor, Claude Code, Copilot, etc.) to write code on a production or serious side project codebase?
          </legend>
          <div className="flex flex-col gap-2.5">
            <Radio name="uses_ai" value="yes" checked={usesAi === 'yes'} onChange={() => setUsesAi('yes')} label="Yes" />
            <Radio name="uses_ai" value="no" checked={usesAi === 'no'} onChange={() => setUsesAi('no')} label="No" />
          </div>
        </fieldset>

        {noAi && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-neutral-500"
          >
            You're done — thanks!
          </motion.p>
        )}

        {showFollowUp && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {/* Q2 */}
            <fieldset>
              <legend className="text-sm font-medium text-neutral-200 mb-3">
                2. Has AI generated code ever drifted from your intended architecture without you noticing right away? If yes, how do you usually catch it?
              </legend>
              <div className="flex flex-col gap-2.5">
                {DRIFT_HOW_OPTIONS.map(opt => (
                  <Checkbox
                    key={opt.value}
                    value={opt.value}
                    checked={driftHow.includes(opt.value)}
                    onChange={() => toggleDriftHow(opt.value)}
                    label={opt.label}
                  />
                ))}
              </div>
            </fieldset>

            {/* Q3 */}
            <fieldset>
              <legend className="text-sm font-medium text-neutral-200 mb-3">
                3. Which of these apply to your experience with AI drift? (select all that apply)
              </legend>
              <div className="flex flex-col gap-2.5">
                {SEVERITY_OPTIONS.map(opt => (
                  <Checkbox
                    key={opt.value}
                    value={opt.value}
                    checked={severity.includes(opt.value)}
                    onChange={() => setSeverity(prev =>
                      prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                    )}
                    label={opt.label}
                  />
                ))}
              </div>
            </fieldset>

            {/* Q4 */}
            <fieldset>
              <legend className="text-sm font-medium text-neutral-200 mb-3">
                4. Want to see the aggregate results once we have enough responses? <span className="text-neutral-500 font-normal">(optional)</span>
              </legend>
              <div className="flex flex-col gap-2.5">
                <Radio name="wants_results" value="yes" checked={wantsResults === 'yes'} onChange={() => setWantsResults('yes')} label="Yes" />
                <Radio name="wants_results" value="no" checked={wantsResults === 'no'} onChange={() => setWantsResults('no')} label="No thanks" />
              </div>
              {wantsResults === 'yes' && (
                <motion.input
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email"
                  className="mt-3 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-700 outline-none focus:border-neutral-600 transition-colors"
                />
              )}
            </fieldset>
          </motion.div>
        )}

        {usesAi !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="self-start rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-white disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </motion.div>
        )}
      </form>
    </motion.div>
  )
}
