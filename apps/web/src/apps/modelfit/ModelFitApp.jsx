import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Bold, ChevronDown, Loader2, Moon, RotateCcw, Sun } from 'lucide-react'
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
  const [theme, setTheme] = useState('dark')
  const [boldMode, setBoldMode] = useState(false)

  const [professorData, setProfessorData] = useState(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState(null)
  const [challengeMenuOpen, setChallengeMenuOpen] = useState(false)

  const { session, updateExpr, toggleVisibility, markTutorialDone, setScoreResult, setSessionId, resetScores } =
    useFitSession(challengeId)

  const isDark = theme === 'dark'

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
        predictions[type] = challenge.test_x.map((x) => evalAt(expr, x) ?? 0)
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

  // --- theme-aware classes ---
  const rootBg = isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'
  const headerBg = isDark
    ? 'border-neutral-900 bg-neutral-950/90'
    : 'border-neutral-200 bg-neutral-50/90'
  const panelBg = isDark
    ? 'border-neutral-900 bg-neutral-950'
    : 'border-neutral-200 bg-white'
  const descBg = isDark
    ? 'border-neutral-800/60 bg-neutral-950/80'
    : 'border-neutral-200/60 bg-white/80'
  const descText = isDark ? 'text-neutral-500' : 'text-neutral-500'

  if (checkingOut || (!challenge && !loadError)) {
    return (
      <div className={`fixed inset-0 ${rootBg} flex items-center justify-center`}>
        <Loader2 size={28} className="animate-spin text-neutral-500" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`fixed inset-0 ${rootBg} flex flex-col items-center justify-center gap-4`}>
        <p className="text-neutral-400 text-sm">{loadError}</p>
        <Link to="/" className="text-xs text-neutral-500 hover:text-neutral-400 underline">← Back to site</Link>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 ${rootBg} flex flex-col overflow-hidden`}>

      {/* Header */}
      <header className={`shrink-0 flex items-center justify-between px-4 py-2.5 border-b ${headerBg} backdrop-blur z-10`}>
        <Link
          to="/"
          className={`flex items-center gap-1.5 text-xs transition-colors ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          <ArrowLeft size={13} /> Back
        </Link>

        <div className="flex items-center gap-1">
          {isProfessor ? (
            <span className={`text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              {professorData?.student_name
                ? `${professorData.student_name}'s results`
                : 'Student results'}
            </span>
          ) : (
            <div className="relative">
              <button
                onClick={() => setChallengeMenuOpen(o => !o)}
                className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isDark ? 'text-neutral-200 hover:text-white' : 'text-neutral-800 hover:text-black'}`}
              >
                {CHALLENGE_LABELS[challengeId]}
                <ChevronDown size={14} className={`transition-transform ${challengeMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {challengeMenuOpen && (
                <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 rounded-xl border shadow-2xl overflow-hidden z-50 ${isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'}`}>
                  {CHALLENGE_IDS.map((id) => (
                    <button
                      key={id}
                      onClick={() => switchChallenge(id)}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'} ${
                        id === challengeId
                          ? isDark ? 'text-neutral-100 font-medium' : 'text-neutral-900 font-medium'
                          : isDark ? 'text-neutral-400' : 'text-neutral-500'
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

        <div className="flex items-center gap-1.5">
          {/* Bold mode toggle */}
          <button
            onClick={() => setBoldMode(b => !b)}
            title="Bold mode — thicker curves and larger points"
            className={`rounded-md p-1.5 transition-colors ${
              boldMode
                ? 'bg-neutral-700 text-white'
                : isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Bold size={14} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`rounded-md p-1.5 transition-colors ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-700'}`}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {!isProfessor && !session.submitted && (
            <button
              onClick={handleCheckFit}
              disabled={scoring}
              className="ml-1 flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-white transition-colors disabled:opacity-60"
            >
              {scoring && <Loader2 size={12} className="animate-spin" />}
              Check My Fit →
            </button>
          )}
          {!isProfessor && session.submitted && (
            <button
              onClick={resetScores}
              className={`ml-1 flex items-center gap-1 text-xs transition-colors ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <RotateCcw size={12} /> Try again
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
              boldMode={boldMode}
              theme={theme}
            />
          )}
          <div className={`absolute bottom-3 left-3 rounded-lg border ${descBg} backdrop-blur px-3 py-2 max-w-xs`}>
            <p className={`text-xs ${descText} leading-relaxed`}>{challenge?.description}</p>
          </div>
        </div>

        {/* Right panel */}
        <div className={`w-80 shrink-0 border-l ${panelBg} flex flex-col overflow-y-auto`}>
          <div className="flex-1 p-4 flex flex-col gap-3">
            {/* Model panels stay mounted so math-field state is preserved across Try Again */}
            <div className={`flex flex-col gap-3 ${submitted ? 'hidden' : ''}`}>
              <p className={`text-xs px-1 ${isDark ? 'text-neutral-600' : 'text-neutral-500'}`}>
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
                  theme={theme}
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
            </div>

            {/* Score reveal animates in/out independently */}
            <AnimatePresence>
              {submitted && (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ScoreReveal
                    scores={activeSession?.scores}
                    bestModel={activeSession?.bestModel}
                    onReset={resetScores}
                    onShare={() => setSubmitOpen(true)}
                  />
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
