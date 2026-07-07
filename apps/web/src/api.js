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

// ---------------------------------------------------------------------------
// Jobs API
// ---------------------------------------------------------------------------

async function jobsRequest(path, options = {}) {
  const res = await fetch(`/api/jobs${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? body?.error ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export const jobsApi = {
  listJobs: ({ type, source, tag, q, limit = 200, offset = 0 } = {}) => {
    const params = new URLSearchParams()
    if (type)   params.set('type',   type)
    if (source) params.set('source', source)
    if (tag)    params.set('tag',    tag)
    if (q)      params.set('q',      q)
    params.set('limit',  limit)
    params.set('offset', offset)
    return jobsRequest(`?${params}`)
  },

  getJob: (id) => jobsRequest(`/${id}`),

  getSources: () => jobsRequest('/sources'),

  refreshAll: () => jobsRequest('/refresh', { method: 'POST' }),
  refreshOne: (sourceId) => jobsRequest(`/refresh/${sourceId}`, { method: 'POST' }),

  enrich: (limit = 50) => jobsRequest(`/enrich?limit=${limit}`, { method: 'POST' }),

  getQueue: () => jobsRequest('/queue'),
  addToQueue: (jobId, priority = 3) =>
    jobsRequest('/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, priority }),
    }),
  updateQueue: (jobId, data) =>
    jobsRequest(`/queue/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  removeFromQueue: (jobId) => jobsRequest(`/queue/${jobId}`, { method: 'DELETE' }),

  getCustomMapperPrompt: () => jobsRequest('/custom-mapper-prompt'),
  saveCustomMapper: (sourceId, config) =>
    jobsRequest('/custom-mappers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId, config }),
    }),
}
