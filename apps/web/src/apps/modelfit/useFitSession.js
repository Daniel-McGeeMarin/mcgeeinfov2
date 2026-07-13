import { useCallback, useEffect, useState } from 'react'

export const MODEL_COLORS = {
  linear: '#60a5fa',
  quadratic: '#34d399',
  exponential: '#fb923c',
}

const INIT_MODELS = {
  linear:      { expr: 'x', visible: true },
  quadratic:   { expr: 'x ^ 2', visible: true },
  exponential: { expr: 'e ^ x', visible: true },
}

function storageKey(challengeId) {
  return `modelfit_${challengeId}`
}

function freshState(challengeId) {
  return {
    challengeId,
    models: INIT_MODELS,
    tutorialDone: false,
    submitted: false,
    scores: null,
    testPoints: null,
    bestModel: null,
    sessionId: null,
  }
}

function loadState(challengeId) {
  try {
    const raw = localStorage.getItem(storageKey(challengeId))
    if (raw) return JSON.parse(raw)
  } catch {}
  return freshState(challengeId)
}

export function useFitSession(challengeId) {
  const [session, setSession] = useState(() => loadState(challengeId))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(challengeId), JSON.stringify(session))
    } catch {}
  }, [session, challengeId])

  const updateExpr = useCallback((type, expr) => {
    setSession(s => ({
      ...s,
      models: { ...s.models, [type]: { ...s.models[type], expr } },
    }))
  }, [])

  const toggleVisibility = useCallback((type) => {
    setSession(s => ({
      ...s,
      models: { ...s.models, [type]: { ...s.models[type], visible: !s.models[type].visible } },
    }))
  }, [])

  const markTutorialDone = useCallback(() => {
    setSession(s => ({ ...s, tutorialDone: true }))
  }, [])

  const setScoreResult = useCallback((scores, testPoints, bestModel) => {
    setSession(s => ({ ...s, submitted: true, scores, testPoints, bestModel }))
  }, [])

  const setSessionId = useCallback((id) => {
    setSession(s => ({ ...s, sessionId: id }))
  }, [])

  const reset = useCallback(() => {
    setSession(s => ({ ...freshState(challengeId), tutorialDone: s.tutorialDone }))
  }, [challengeId])

  return { session, updateExpr, toggleVisibility, markTutorialDone, setScoreResult, setSessionId, reset }
}
