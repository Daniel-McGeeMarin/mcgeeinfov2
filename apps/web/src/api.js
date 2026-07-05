// The API is a separately deployed service (see CLAUDE.md) — point this at wherever
// it's actually reachable via VITE_API_URL at build time. Defaults to the local
// `uv run uvicorn api.main:app --reload` dev port for local development.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function getPokerEquity({ hero, board, opponents, trials }) {
  const res = await fetch(`${API_URL}/api/poker/equity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hero, board, opponents, trials }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`)
  }

  return res.json()
}
