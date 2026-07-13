import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, Loader2, RotateCcw } from 'lucide-react'
import { compile } from 'mathjs'

import Graph from './Graph'
import ModelPanel from './ModelPanel'
import ScoreReveal from './ScoreReveal'
import SubmitModal from './SubmitModal'
import Tutorial from './Tutorial'
import { getChallenge, getSession, scoreModels } from './api'
import { useFitSession } from './useFitSession'

const CHALLENGE_IDS = ['bacteria', 'cannonball', 'car_speed']
const CHALLENGE_LABELS = { bacteria: 'Bacteria Colony', cannonball: 'Cannonball Arc', car_speed: 'Highway Drive' }

function evalAt(expr, x) {
  try {
    const v = compile(expr).evaluate({ x })
    return typeof v === 'number' && isFinite(v) ? v : null
  } catch {
    return null
  }
}

export default function ModelFitApp() {
  const [params, setParams] = useSearchParams()
  const sessionParam = params.get('session')
  const challengeParam = params.get('c') || 'bacteria'

  const [challengeId, setChallengeId] = useState(challengeParam)
  const [challenge, setChallenge] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [professorData, setProfessorData] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState(null)
  const [challengeMenuOpen, setChallengeMenuOpen] = useState(false)

  const { session, updateExpr, toggleVisibility, markTutorialDone, setScoreResult, setSessionId, reset } =
    useFitSession(challengeId)

  // Load challenge data
  useEffect(() => {
    if (sessionParam) return
    setChallenge(null)
    setLoadError(null)
    getChallenge(challengeId)
      .then(setChallenge)
      .catch((e) => setLoadError(e.message))
  }, [challengeId, sessionParam])

  // Professor view: load session
  useEffect(() => {
    if (!sessionParam) return
    setCheckingOut(true)
    getSession(sessionParam)
      .then((data) => {
        setProfessorData(data)
        return getChallenge(data.challenge_id)
      })
      .then((c) => {
        setChallenge(c)
        setCheckingOut(false)
      })
      .catch(() => {
        setLoadError('Session not found.')
        setCheckingOut(false)
      })
  }, [sessionParam])

  function switchChallenge(id) {
    setChallengeId(id)
    setParams(id === 'bacteria' ? {} : { c: id })
    setChallengeMenuOpen(false)
  }

  async function handleCheckFit() {
    if (!challenge) return
    setScoring(true)
    setScoreError(null)
    try {
      const predictions = {}
      for (const type of ['linear', 'quadratic', 'exponential']) {
        const expr = session.models[type].expr
        predictions[type] = challenge.test_x.map((x) => {
          const v = evalAt(expr, x)
          return v ?? 0
        })
      }
      const result = await scoreModels(challengeId, predictions)
      setScoreResult(result.scores, result.test_points, result.best_model)
    } catch (e) {
      setScoreError(e.message)
    } finally {
      setScoring(false)
    }
  }

  const isProfessor = !!sessionParam
  const activeModels = isProfessor ? professorData?.state?.models : session.models
  const activeSession = isProfessor ? professorData?.state : session
  const submitted = isProfessor || session.submitted

  if (checkingOut || (!challenge && !loadError)) {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-neutral-600" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400 text-sm">{loadError}</p>
        <Link to="/" className="text-xs text-neutral-600 hover:text-neutral-400 underline">← Back to site</Link>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-neutral-950 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-neutral-900 bg-neutral-950/90 backdrop-blur z-10">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft size={13} /> Back
        </Link>

        <div className="flex items-center gap-1">
          {isProfessor ? (
            <span className="text-sm font-semibold text-neutral-200">
              {professorData?.student_name
                ? `${professorData.student_name}'s results`
                : 'Student results'}
            </span>
          ) : (
            <div className="relative">
              <button
                onClick={() => setChallengeMenuOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm font-semibold text-neutral-200 hover:text-white transition-colors"
              >
                {CHALLENGE_LABELS[challengeId]}
                <ChevronDown size={14} className={`transition-transform ${challengeMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {challengeMenuOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden z-50">
                  {CHALLENGE_IDS.map((id) => (
                    <button
                      key={id}
                      onClick={() => switchChallenge(id)}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-800 ${
                        id === challengeId ? 'text-neutral-100 font-medium' : 'text-neutral-400'
                      }`}
                    >
                      {CHALLENGE_LABELS[id]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isProfessor && !session.submitted && (
            <button
              onClick={handleCheckFit}
              disabled={scoring}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-white transition-colors disabled:opacity-60"
            >
              {scoring && <Loader2 size={12} className="animate-spin" />}
              Check My Fit →
            </button>
          )}
          {!isProfessor && session.submitted && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">

        {/* Graph */}
        <div className="flex-1 min-w-0 relative">
          {challenge && (
            <Graph
              trainPoints={challenge.train}
              testPoints={submitted ? (activeSession?.testPoints ?? null) : null}
              models={activeModels ?? session.models}
              xDomain={challenge.x_domain}
              yDomain={challenge.y_domain}
            />
          )}
          {/* Challenge description */}
          <div className="absolute bottom-3 left-3 rounded-lg border border-neutral-800/60 bg-neutral-950/80 backdrop-blur px-3 py-2 max-w-xs">
            <p className="text-xs text-neutral-500 leading-relaxed">{challenge?.description}</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 border-l border-neutral-900 flex flex-col overflow-y-auto bg-neutral-950">
          <div className="flex-1 p-4 flex flex-col gap-3">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ScoreReveal
                    scores={activeSession?.scores}
                    bestModel={activeSession?.bestModel}
                    onReset={reset}
                    onShare={() => setSubmitOpen(true)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="panels"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-xs text-neutral-600 px-1">
                    Adjust each equation to fit the white data points. Toggle curves with the eye icon.
                  </p>
                  {['linear', 'quadratic', 'exponential'].map((type) => (
                    <ModelPanel
                      key={type}
                      type={type}
                      model={session.models[type]}
                      onExprChange={updateExpr}
                      onToggleVisibility={toggleVisibility}
                      disabled={false}
                    />
                  ))}
                  {scoreError && (
                    <p className="text-xs text-red-400 px-1">{scoreError}</p>
                  )}
                  <button
                    onClick={handleCheckFit}
                    disabled={scoring}
                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-950 hover:bg-white transition-colors disabled:opacity-60"
                  >
                    {scoring && <Loader2 size={14} className="animate-spin" />}
                    Check My Fit →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tutorial on first visit */}
      <AnimatePresence>
        {!session.tutorialDone && !isProfessor && (
          <Tutorial onDone={markTutorialDone} />
        )}
      </AnimatePresence>

      <SubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        challengeId={challengeId}
        session={session}
      />
    </div>
  )
}
