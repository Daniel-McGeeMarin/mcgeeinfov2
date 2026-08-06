async function financeRequest(path, options = {}) {
  const res = await fetch(`/api/finance${path}`, { redirect: 'manual', ...options })
  if (res.type === 'opaqueredirect') {
    const err = new Error('Not authenticated')
    err.status = 401
    throw err
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const financeApi = {
  listPeriods: () => financeRequest('/periods'),
  getActivePeriod: () => financeRequest('/periods/active'),
  createPeriod: (openedAt, balanceStart, notes) =>
    financeRequest('/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opened_at: openedAt, balance_start: balanceStart, notes }),
    }),
  getPeriodSummary: (id) => financeRequest(`/periods/${id}/summary`),
  lockPeriod: (id) => financeRequest(`/periods/${id}/lock`, { method: 'POST' }),

  importCsv: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return financeRequest('/import', { method: 'POST', body: fd })
  },
  getImportLog: () => financeRequest('/import/log'),

  listTransactions: ({ periodId, source, reimbursable, q, limit = 500 } = {}) => {
    const params = new URLSearchParams()
    if (periodId !== undefined) params.set('period_id', periodId)
    if (source !== undefined) params.set('source', source)
    if (reimbursable !== undefined) params.set('reimbursable', reimbursable)
    if (q) params.set('q', q)
    params.set('limit', limit)
    return financeRequest(`/transactions?${params}`)
  },
  patchTransaction: (id, reimbursable) =>
    financeRequest(`/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reimbursable }),
    }),
  bulkLabel: (updates) =>
    financeRequest('/transactions/bulk-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    }),
}
