import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { jobsApi } from '../api'

const TAG_META = {
  no_sponsorship:         { label: 'No Sponsorship', color: 'bg-red-900/60 text-red-300' },
  us_citizenship_required:{ label: 'US Citizen',     color: 'bg-orange-900/60 text-orange-300' },
  closed:                 { label: 'Closed',          color: 'bg-neutral-800 text-neutral-500' },
  faang_plus:             { label: 'FAANG+',          color: 'bg-amber-900/60 text-amber-300' },
  advanced_degree:        { label: 'Grad Degree',     color: 'bg-purple-900/60 text-purple-300' },
  fast_apply:             { label: '⚡ Fast Apply',    color: 'bg-emerald-900/60 text-emerald-300' },
  high_impact:            { label: '⭐ High Impact',   color: 'bg-blue-900/60 text-blue-300' },
  remote:                 { label: 'Remote',           color: 'bg-teal-900/60 text-teal-300' },
}

function Tag({ id }) {
  const meta = TAG_META[id]
  if (!meta) {
    // term_* tags
    const label = id.startsWith('term_') ? id.replace('term_', '').replace(/_/g, ' ') : id
    return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400">{label}</span>
  }
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
}

function SourceDot({ count }) {
  if (count <= 1) return null
  return (
    <span className="ml-1 rounded-full bg-blue-900/60 px-1.5 py-0.5 text-[10px] text-blue-300">
      {count} sources
    </span>
  )
}

export default function Jobs() {
  const [jobs, setJobs]           = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [actionMsg, setActionMsg] = useState('')

  const [filters, setFilters] = useState({ type: '', tag: '', q: '' })
  const [sources, setSources] = useState([])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { jobs: list, total: t } = await jobsApi.listJobs({
        type:   filters.type   || undefined,
        tag:    filters.tag    || undefined,
        q:      filters.q      || undefined,
        limit:  300,
      })
      setJobs(list)
      setTotal(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  useEffect(() => {
    jobsApi.getSources().then(({ sources: s }) => setSources(s)).catch(() => {})
  }, [])

  const handleRefresh = async () => {
    setActionMsg('Refreshing all sources…')
    try {
      await jobsApi.refreshAll()
      setActionMsg('Refresh started — reload in a minute.')
    } catch (e) {
      setActionMsg(`Error: ${e.message}`)
    }
  }

  const handleEnrich = async () => {
    setActionMsg('Enriching…')
    try {
      await jobsApi.enrich(50)
      setActionMsg('Enrichment pass started.')
    } catch (e) {
      setActionMsg(`Error: ${e.message}`)
    }
  }

  const handleAddToQueue = async (jobId) => {
    try {
      await jobsApi.addToQueue(jobId)
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, in_queue: true } : j))
    } catch (e) {
      setActionMsg(`Queue error: ${e.message}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen p-6 lg:p-10"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Job Browser</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{total} jobs indexed · <Link to="/apps/jobs/queue" className="text-amber-400 hover:underline">My Queue →</Link></p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors">
            Refresh sources
          </button>
          <button onClick={handleEnrich} className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors">
            Enrich (50)
          </button>
        </div>
      </div>

      {actionMsg && (
        <p className="mb-4 text-sm text-amber-300">{actionMsg}</p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search company, role, location…"
          value={filters.q}
          onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-400 w-64"
        />
        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300"
        >
          <option value="">All types</option>
          <option value="summer">Summer</option>
          <option value="offseason">Off-season</option>
          <option value="new_grad">New Grad</option>
        </select>
        <select
          value={filters.tag}
          onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300"
        >
          <option value="">All tags</option>
          <option value="fast_apply">⚡ Fast Apply</option>
          <option value="high_impact">⭐ High Impact</option>
          <option value="faang_plus">🔥 FAANG+</option>
          <option value="no_sponsorship">🛂 No Sponsorship</option>
          <option value="closed">🔒 Closed</option>
          <option value="remote">Remote</option>
        </select>
        {(filters.q || filters.type || filters.tag) && (
          <button
            onClick={() => setFilters({ type: '', tag: '', q: '' })}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sources status bar */}
      {sources.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {sources.map(s => (
            <span key={s.source_id} className="text-[11px] text-neutral-600">
              {s.source_id}: {s.last_run_at ? new Date(s.last_run_at).toLocaleDateString() : 'never'}
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-neutral-500 text-sm">Loading…</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <p className="text-lg mb-2">No jobs yet.</p>
          <p className="text-sm">Hit <strong>Refresh sources</strong> to pull in listings.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Location</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Posted</th>
                <th className="px-4 py-2.5 font-medium">Tags</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, i) => (
                <tr
                  key={job.id}
                  className={`border-b border-neutral-900 hover:bg-neutral-900/40 transition-colors ${
                    job.tags?.includes('closed') ? 'opacity-40' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-neutral-100 whitespace-nowrap">
                    {job.company}
                    <SourceDot count={(job.source_ids || []).length} />
                  </td>
                  <td className="px-4 py-2.5 text-neutral-300">{job.role}</td>
                  <td className="px-4 py-2.5 text-neutral-500 hidden md:table-cell max-w-[160px] truncate">
                    {job.location}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500 hidden lg:table-cell whitespace-nowrap">
                    {job.date_posted || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(job.tags || []).map(t => <Tag key={t} id={t} />)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.apply_url && (
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-400 hover:text-amber-300"
                        >
                          Apply →
                        </a>
                      )}
                      <button
                        onClick={() => handleAddToQueue(job.id)}
                        disabled={job.in_queue}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          job.in_queue
                            ? 'text-neutral-600 cursor-default'
                            : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
                        }`}
                      >
                        {job.in_queue ? '✓ Queued' : '+ Queue'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
