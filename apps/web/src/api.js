// Same-origin relative paths — apps/api's routes already assume this (see docs_url="/api/docs"
// in main.py), so whatever reverse proxy serves this site in production is expected to route
// /api/* to the api service. Local dev gets the same relative-path behavior via the Vite dev
// server proxy in vite.config.js, which forwards /api to the local uvicorn dev server.
export async function getPokerEquity({ hero, board, opponents, trials }) {
  const res = await fetch('/api/poker/equity', {
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
