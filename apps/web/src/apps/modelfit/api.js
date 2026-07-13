export async function getChallenges() {
  const res = await fetch('/api/modelfit/challenges')
  if (!res.ok) throw new Error('Failed to load challenges')
  return res.json()
}

export async function getChallenge(challengeId) {
  const res = await fetch(`/api/modelfit/challenge/${challengeId}`)
  if (!res.ok) throw new Error('Failed to load challenge')
  return res.json()
}

export async function scoreModels(challengeId, predictions) {
  const res = await fetch('/api/modelfit/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId, predictions }),
  })
  if (!res.ok) throw new Error('Failed to score models')
  return res.json()
}

export async function saveSession(studentName, challengeId, state) {
  const res = await fetch('/api/modelfit/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_name: studentName || null, challenge_id: challengeId, state }),
  })
  if (!res.ok) throw new Error('Failed to save session')
  return res.json()
}

export async function getSession(sessionId) {
  const res = await fetch(`/api/modelfit/session/${sessionId}`)
  if (!res.ok) throw new Error('Session not found')
  return res.json()
}
