import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { financeApi } from '../api'
import {
  Upload, Check, X, HelpCircle, Lock, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle, History, LayoutList, Import, Wallet,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCES = {
  us_bank:     { label: 'US Bank',      color: 'bg-red-900/40 text-red-300 border-red-800',         exportUrl: 'https://onlinebanking.usbank.com/',                                                                    hint: 'Sign in → select account → Download Transactions' },
  capital_one: { label: 'Capital One',  color: 'bg-blue-900/40 text-blue-300 border-blue-800',       exportUrl: 'https://myaccounts.capitalone.com/',                                                                  hint: 'Open your card page, copy the URL from the address bar, paste it below', urlBuilder: true },
  discover:    { label: 'Discover',     color: 'bg-orange-900/40 text-orange-300 border-orange-800', exportUrl: 'https://portal.discover.com/customersvcs/universalLogin/ac_main',                                    hint: 'Statements & Activity → Download → Spreadsheet' },
  venmo:       { label: 'Venmo',        color: 'bg-teal-900/40 text-teal-300 border-teal-800',        exportUrl: 'https://account.venmo.com/settings/statements',                                                     hint: 'Select month → Download CSV' },
  amazon:      { label: 'Amazon',       color: 'bg-yellow-900/40 text-yellow-300 border-yellow-800', exportUrl: 'https://www.amazon.com/gp/b2b/reports',                                                              hint: 'Order History Reports → Request Report → Download' },
}

const REIMBURSABLE_LABELS = {
  1: { label: 'Yes',    icon: Check,       cls: 'text-emerald-400 bg-emerald-950/60 border-emerald-800 hover:bg-emerald-900/60' },
  0: { label: 'No',     icon: X,           cls: 'text-red-400 bg-red-950/60 border-red-800 hover:bg-red-900/60' },
  2: { label: 'Review', icon: HelpCircle,  cls: 'text-yellow-400 bg-yellow-950/60 border-yellow-800 hover:bg-yellow-900/60' },
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const fmtDate = (s) => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// ---------------------------------------------------------------------------
// Small reusable components
// ---------------------------------------------------------------------------

function CapitalOneUrlBuilder() {
  const [url, setUrl] = useState('')
  const dest = (() => {
    try {
      const clean = url.split('?')[0].replace(/\/+$/, '')
      return clean.includes('/Card/') ? clean + '/DownloadTransactions' : null
    } catch { return null }
  })()
  return (
    <div className="flex gap-1.5 mt-1">
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Paste Capital One card URL…"
        className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300 placeholder-neutral-600 outline-none focus:border-neutral-500"
      />
      <button
        disabled={!dest}
        onClick={() => window.open(dest, '_blank', 'noopener')}
        className="shrink-0 rounded border border-blue-800 bg-blue-950/40 px-2 py-1 text-[10px] font-medium text-blue-400 transition-colors hover:bg-blue-950/70 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Go →
      </button>
    </div>
  )
}

function SourceBadge({ source }) {
  const s = SOURCES[source]
  if (!s) return <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium border-neutral-700 text-neutral-500">{source}</span>
  return <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${s.color}`}>{s.label}</span>
}

function ReimbursableToggle({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {[1, 0, 2].map((v) => {
        const { label, icon: Icon, cls } = REIMBURSABLE_LABELS[v]
        return (
          <button
            key={v}
            disabled={disabled}
            onClick={() => onChange(v)}
            title={label}
            className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-all disabled:opacity-40 ${
              value === v ? cls : 'border-neutral-800 text-neutral-600 hover:border-neutral-700 hover:text-neutral-400'
            }`}
          >
            <Icon size={10} strokeWidth={2.5} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Icon size={32} className="text-neutral-700" />
      <p className="text-sm font-medium text-neutral-400">{title}</p>
      {body && <p className="max-w-xs text-xs text-neutral-600">{body}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Import
// ---------------------------------------------------------------------------

function ImportTab({ activePeriod, onImported }) {
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState(null)
  const [importLog, setImportLog] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    financeApi.getImportLog().then(r => setImportLog(r.log)).catch(() => {})
  }, [lastResult])

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    setImporting(true)
    setError(null)
    try {
      const result = await financeApi.importCsv(file)
      setLastResult(result)
      onImported()
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }, [onImported])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  return (
    <div className="space-y-8">
      {/* Source cards with export links */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-600">Export your data</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(SOURCES).map(([id, s]) => (
            <div key={id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 space-y-2">
              <a
                href={s.exportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2"
              >
                <SourceBadge source={id} />
                <ExternalLink size={10} className="text-neutral-700 group-hover:text-neutral-500 transition-colors" />
              </a>
              <p className="text-[10px] text-neutral-600 leading-relaxed">{s.hint}</p>
              {s.urlBuilder && <CapitalOneUrlBuilder />}
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-600">Upload CSV</p>
        {!activePeriod && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-900/50 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-400">
            <AlertTriangle size={12} />
            No active period — create one in the Lock In tab first so transactions get assigned correctly.
          </div>
        )}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !importing && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors ${
            dragging
              ? 'border-amber-500/60 bg-amber-950/20'
              : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/50'
          }`}
        >
          {importing ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-amber-400" />
              <p className="text-sm text-neutral-400">Importing…</p>
            </>
          ) : (
            <>
              <Upload size={24} className="text-neutral-600" />
              <div>
                <p className="text-sm font-medium text-neutral-300">Drop a CSV here, or click to browse</p>
                <p className="mt-1 text-xs text-neutral-600">Source is auto-detected from column headers</p>
              </div>
            </>
          )}
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            <X size={12} />
            {error}
          </div>
        )}

        {lastResult && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-400">
            <Check size={12} />
            <span>
              <strong>{SOURCES[lastResult.source]?.label ?? lastResult.source}</strong> — {lastResult.new} new, {lastResult.duplicates} dupes skipped
              {lastResult.skipped_before_cutoff > 0 && `, ${lastResult.skipped_before_cutoff} before cutoff`}
            </span>
          </div>
        )}
      </div>

      {/* Import log */}
      {importLog.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-600">Import history</p>
          <div className="overflow-hidden rounded-lg border border-neutral-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/60">
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">Source</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">File</th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">New</th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">Dupes</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">When</th>
                </tr>
              </thead>
              <tbody>
                {importLog.map((log) => (
                  <tr key={log.id} className="border-b border-neutral-800/50 last:border-0">
                    <td className="px-3 py-2"><SourceBadge source={log.source} /></td>
                    <td className="px-3 py-2 text-neutral-500 truncate max-w-[200px]" title={log.filename}>{log.filename || '—'}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{log.new_count}</td>
                    <td className="px-3 py-2 text-right text-neutral-600">{log.dupe_count}</td>
                    <td className="px-3 py-2 text-neutral-600">{fmtDate(log.imported_at.split('T')[0])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Review
// ---------------------------------------------------------------------------

function ReviewTab({ activePeriod, refreshSignal }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null) // null=all, 0, 1, 2
  const [q, setQ] = useState('')

  const load = useCallback(() => {
    if (!activePeriod) { setLoading(false); return }
    setLoading(true)
    financeApi.listTransactions({ periodId: activePeriod.id })
      .then(r => setTransactions(r.transactions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activePeriod])

  useEffect(load, [load, refreshSignal])

  const handleToggle = useCallback(async (id, value) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, reimbursable: value, reimbursable_reviewed: 1 } : t))
    try { await financeApi.patchTransaction(id, value) }
    catch { load() }
  }, [load])

  const filtered = transactions.filter(t => {
    if (sourceFilter && t.source !== sourceFilter) return false
    if (statusFilter !== null && t.reimbursable !== statusFilter) return false
    if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const reimbursableTotal = transactions
    .filter(t => t.reimbursable === 1 && t.amount > 0)
    .reduce((s, t) => s + t.amount, 0)

  const needsReview = transactions.filter(t => t.reimbursable === 2).length
  const usedSources = [...new Set(transactions.map(t => t.source))]

  if (!activePeriod) return <EmptyState icon={LayoutList} title="No active period" body="Create a period in the Lock In tab to start tracking." />

  return (
    <div className="space-y-4">
      {/* Sticky summary bar */}
      <div className="sticky top-0 z-10 -mx-6 flex items-center gap-4 border-b border-neutral-800 bg-neutral-950/95 px-6 py-3 backdrop-blur">
        <div className="flex-1 flex items-center gap-4 text-xs text-neutral-400 flex-wrap">
          <span><span className="font-medium text-neutral-200">{transactions.length}</span> transactions</span>
          <span className="text-emerald-400 font-medium">{fmt.format(reimbursableTotal)} reimbursable</span>
          {needsReview > 0 && (
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle size={11} />
              {needsReview} need review
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Source pills */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSourceFilter(null)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${sourceFilter === null ? 'border-neutral-600 bg-neutral-800 text-neutral-200' : 'border-neutral-800 text-neutral-600 hover:text-neutral-400'}`}
          >All</button>
          {usedSources.map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(sourceFilter === s ? null : s)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${sourceFilter === s ? 'border-neutral-600 bg-neutral-800 text-neutral-200' : 'border-neutral-800 text-neutral-600 hover:text-neutral-400'}`}
            >
              {SOURCES[s]?.label ?? s}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 ml-2">
          {[null, 1, 0, 2].map((v) => {
            const label = v === null ? 'All' : REIMBURSABLE_LABELS[v].label
            return (
              <button
                key={String(v)}
                onClick={() => setStatusFilter(v)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${statusFilter === v ? 'border-neutral-600 bg-neutral-800 text-neutral-200' : 'border-neutral-800 text-neutral-600 hover:text-neutral-400'}`}
              >{label}</button>
            )
          })}
        </div>

        {/* Search */}
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search description…"
          className="ml-auto rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-700 outline-none focus:border-neutral-600"
        />
      </div>

      {/* Transaction table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-amber-400" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={LayoutList} title="No transactions match" body="Try adjusting your filters." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/60">
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Date</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Source</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Description</th>
                <th className="px-3 py-2 text-right font-medium text-neutral-500">Amount</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Reimbursable?</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  className={`border-b border-neutral-800/40 last:border-0 transition-colors ${tx.reimbursable === 1 ? 'bg-emerald-950/10' : tx.reimbursable === 2 ? 'bg-yellow-950/10' : ''}`}
                >
                  <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-3 py-2"><SourceBadge source={tx.source} /></td>
                  <td className="px-3 py-2 text-neutral-300 max-w-[280px]">
                    <span className="truncate block" title={tx.description}>{tx.description}</span>
                    {tx.category && <span className="text-neutral-600 text-[10px]">{tx.category}</span>}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono whitespace-nowrap ${tx.amount > 0 ? 'text-neutral-200' : 'text-neutral-600'}`}>
                    {tx.amount > 0 ? fmt.format(tx.amount) : `(${fmt.format(-tx.amount)})`}
                  </td>
                  <td className="px-3 py-2">
                    <ReimbursableToggle
                      value={tx.reimbursable}
                      onChange={(v) => handleToggle(tx.id, v)}
                      disabled={tx.amount <= 0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Lock In
// ---------------------------------------------------------------------------

function LockInTab({ activePeriod, onLocked, onCreatePeriod }) {
  const [summary, setSummary] = useState(null)
  const [locking, setLocking] = useState(false)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  // Create period form state
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 10))
  const [balanceStart, setBalanceStart] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!activePeriod) return
    financeApi.getPeriodSummary(activePeriod.id).then(setSummary).catch(() => {})
  }, [activePeriod])

  const handleLock = async () => {
    if (!activePeriod) return
    setLocking(true)
    setError(null)
    try {
      await financeApi.lockPeriod(activePeriod.id)
      onLocked()
    } catch (e) {
      setError(e.message)
    } finally {
      setLocking(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await onCreatePeriod(openedAt, balanceStart ? parseFloat(balanceStart) : null)
      setShowCreate(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  if (!activePeriod) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-10">
        <div className="text-center">
          <Wallet size={32} className="mx-auto mb-3 text-neutral-700" />
          <p className="text-sm font-medium text-neutral-300">No active period</p>
          <p className="mt-1 text-xs text-neutral-600">Create a new budget period to start tracking.</p>
        </div>
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="mx-auto flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 transition-colors"
          >
            Start new period
          </button>
        ) : (
          <form onSubmit={handleCreate} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">New budget period</p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-neutral-400">Cutoff date (transactions <em>from</em> this date forward are included)</span>
                <input
                  type="date"
                  value={openedAt}
                  onChange={e => setOpenedAt(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-neutral-400">Starting bank balance (optional)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balanceStart}
                  onChange={e => setBalanceStart(e.target.value)}
                  placeholder="e.g. 2000"
                  className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-700 outline-none focus:border-neutral-500"
                />
              </label>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50">
                {creating ? 'Creating…' : 'Create period'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  const needsReview = summary?.needs_review ?? 0
  const reimbursableTotal = summary?.reimbursable_total ?? 0

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Period overview */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Active period</p>
          <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Open</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-neutral-600">Started</p>
            <p className="font-medium text-neutral-200">{fmtDate(activePeriod.opened_at)}</p>
          </div>
          {activePeriod.balance_start != null && (
            <div>
              <p className="text-xs text-neutral-600">Starting balance</p>
              <p className="font-medium text-neutral-200">{fmt.format(activePeriod.balance_start)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-neutral-600">Total transactions</p>
            <p className="font-medium text-neutral-200">{summary?.total ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-600">To be reimbursed</p>
            <p className="text-xl font-bold text-emerald-400">{fmt.format(reimbursableTotal)}</p>
          </div>
        </div>
      </div>

      {/* By-source breakdown */}
      {summary?.by_source?.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Breakdown by source</p>
          {summary.by_source.map(r => (
            <div key={r.source} className="flex items-center gap-3">
              <SourceBadge source={r.source} />
              <div className="flex-1 text-xs text-neutral-500">{r.total} txns</div>
              <span className="text-xs font-medium text-emerald-400">{fmt.format(r.reimbursable_total ?? 0)}</span>
              {r.needs_review > 0 && (
                <span className="text-[10px] text-yellow-500">{r.needs_review} review</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Needs-review warning */}
      {needsReview > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-900/50 bg-yellow-950/30 px-4 py-3 text-xs text-yellow-400">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{needsReview} transaction{needsReview > 1 ? 's' : ''} still need review. Go to the Review tab to resolve them before locking.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-400">
          <X size={12} />
          {error}
        </div>
      )}

      {/* Lock button */}
      <button
        onClick={handleLock}
        disabled={locking || needsReview > 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Lock size={15} />
        {locking ? 'Locking…' : `Lock in — ${fmt.format(reimbursableTotal)} reimbursable`}
      </button>
      <p className="text-center text-[10px] text-neutral-700">
        This closes the current period and records the reimbursement total. A new period starts automatically.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: History
// ---------------------------------------------------------------------------

function HistoryTab({ periods }) {
  const [expanded, setExpanded] = useState(null)
  const [txMap, setTxMap] = useState({})

  const togglePeriod = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!txMap[id]) {
      try {
        const r = await financeApi.listTransactions({ periodId: id, limit: 1000 })
        setTxMap(m => ({ ...m, [id]: r.transactions }))
      } catch {}
    }
  }

  const locked = periods.filter(p => p.locked_at)

  if (locked.length === 0) {
    return <EmptyState icon={History} title="No locked periods yet" body="Lock in your first period to see history here." />
  }

  return (
    <div className="space-y-3">
      {locked.map(p => {
        const isOpen = expanded === p.id
        const txs = txMap[p.id] ?? []
        return (
          <div key={p.id} className="rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
            <button
              onClick={() => togglePeriod(p.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-neutral-900/50 transition-colors"
            >
              <div className="flex-1 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-neutral-600">Period</p>
                  <p className="font-medium text-neutral-300">{fmtDate(p.opened_at)} – {fmtDate(p.locked_at.split('T')[0])}</p>
                </div>
                <div>
                  <p className="text-neutral-600">Reimbursed</p>
                  <p className="text-lg font-bold text-emerald-400">{fmt.format(p.reimbursement_total ?? 0)}</p>
                </div>
                {p.balance_start != null && (
                  <div>
                    <p className="text-neutral-600">Start balance</p>
                    <p className="font-medium text-neutral-300">{fmt.format(p.balance_start)}</p>
                  </div>
                )}
              </div>
              {isOpen ? <ChevronUp size={14} className="text-neutral-600 shrink-0" /> : <ChevronDown size={14} className="text-neutral-600 shrink-0" />}
            </button>

            {isOpen && (
              <div className="border-t border-neutral-800">
                {txs.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-neutral-600">No transactions found.</p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      {txs.map(tx => (
                        <tr key={tx.id} className="border-b border-neutral-800/40 last:border-0">
                          <td className="px-4 py-2 text-neutral-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                          <td className="px-4 py-2"><SourceBadge source={tx.source} /></td>
                          <td className="px-4 py-2 text-neutral-400 max-w-[280px] truncate">{tx.description}</td>
                          <td className="px-4 py-2 text-right font-mono text-neutral-300">{fmt.format(tx.amount)}</td>
                          <td className="px-4 py-2">
                            {tx.reimbursable === 1
                              ? <span className="text-emerald-500">✓ Yes</span>
                              : <span className="text-neutral-700">No</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'import',  label: 'Import',  icon: Import },
  { id: 'review',  label: 'Review',  icon: LayoutList },
  { id: 'lock',    label: 'Lock In', icon: Lock },
  { id: 'history', label: 'History', icon: History },
]

export default function Finance() {
  const [tab, setTab] = useState('import')
  const [activePeriod, setActivePeriod] = useState(null)
  const [periods, setPeriods] = useState([])
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [notAuthed, setNotAuthed] = useState(false)

  const loadData = useCallback(() => {
    financeApi.listPeriods()
      .then(r => {
        setPeriods(r.periods)
        const active = r.periods.find(p => !p.locked_at) ?? null
        setActivePeriod(active)
      })
      .catch(e => {
        if (e.status === 401 || e.message?.includes('Not authenticated')) setNotAuthed(true)
      })
  }, [])

  useEffect(loadData, [loadData])

  const handleImported = () => setRefreshSignal(s => s + 1)

  const handleLocked = () => {
    loadData()
    setTab('history')
  }

  const handleCreatePeriod = async (openedAt, balanceStart) => {
    await financeApi.createPeriod(openedAt, balanceStart)
    loadData()
  }

  if (notAuthed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
        <Lock size={32} className="text-neutral-700" />
        <p className="text-sm font-medium text-neutral-300">Sign in to access Finance Tracker</p>
        <a href="https://auth.mcgeedan.com" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 transition-colors">
          Sign in
        </a>
      </div>
    )
  }

  const reimbursableTotal = activePeriod
    ? null // computed per-tab
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-5xl px-6 py-8"
    >
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">Finance Tracker</h1>
          <p className="mt-0.5 text-xs text-neutral-600">
            {activePeriod
              ? `Active period since ${fmtDate(activePeriod.opened_at)}${activePeriod.balance_start != null ? ` · started at ${fmt.format(activePeriod.balance_start)}` : ''}`
              : 'No active period'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-neutral-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors -mb-px ${
              tab === id
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'import'  && <ImportTab activePeriod={activePeriod} onImported={handleImported} />}
      {tab === 'review'  && <ReviewTab activePeriod={activePeriod} refreshSignal={refreshSignal} />}
      {tab === 'lock'    && <LockInTab activePeriod={activePeriod} onLocked={handleLocked} onCreatePeriod={handleCreatePeriod} />}
      {tab === 'history' && <HistoryTab periods={periods} />}
    </motion.div>
  )
}
