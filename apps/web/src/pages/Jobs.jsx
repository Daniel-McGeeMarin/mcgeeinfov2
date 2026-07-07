import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { jobsApi } from '../api'

// ---------------------------------------------------------------------------
// Source metadata — labels and GitHub file URLs for the source columns feature.
// Text fragments (#:~:text=) make Chrome/Edge jump to and highlight the company row.
// ---------------------------------------------------------------------------
const SOURCE_META = {
  vanshb03_summer2027: {
    label: 'vanshb03 Summer',
    fileUrl: (company) =>
      `https://github.com/vanshb03/Summer2027-Internships/blob/dev/README.md#:~:text=${encodeURIComponent(company)}`,
  },
  vanshb03_offseason2027: {
    label: 'vanshb03 Off-season',
    fileUrl: (company) =>
      `https://github.com/vanshb03/Summer2027-Internships/blob/dev/OFFSEASON_README.md#:~:text=${encodeURIComponent(company)}`,
  },
  simplifyjobs_summer2027: {
    label: 'Simplify Summer',
    fileUrl: (company) =>
      `https://github.com/SimplifyJobs/Summer2026-Internships/blob/dev/README.md#:~:text=${encodeURIComponent(company)}`,
  },
  simplifyjobs_offseason2027: {
    label: 'Simplify Off-season',
    fileUrl: (company) =>
      `https://github.com/SimplifyJobs/Summer2026-Internships/blob/dev/README-Off-Season.md#:~:text=${encodeURIComponent(company)}`,
  },
  speedyapply_swe_2027: {
    label: 'SpeedyApply SWE',
    fileUrl: (company) =>
      `https://github.com/speedyapply/2027-SWE-College-Jobs/blob/main/INTERN_USA.md#:~:text=${encodeURIComponent(company)}`,
  },
  speedyapply_ai_2027: {
    label: 'SpeedyApply AI',
    fileUrl: (company) =>
      `https://github.com/speedyapply/2027-AI-College-Jobs/blob/main/INTERN_USA.md#:~:text=${encodeURIComponent(company)}`,
  },
}

// ---------------------------------------------------------------------------
// Tag display metadata
// ---------------------------------------------------------------------------
const TAG_META = {
  no_sponsorship:          { label: 'No Sponsorship', color: 'bg-red-900/60 text-red-300' },
  us_citizenship_required: { label: 'US Citizen',     color: 'bg-orange-900/60 text-orange-300' },
  closed:                  { label: 'Closed',          color: 'bg-neutral-800 text-neutral-500' },
  faang_plus:              { label: 'FAANG+',          color: 'bg-amber-900/60 text-amber-300' },
  advanced_degree:         { label: 'Grad Degree',     color: 'bg-purple-900/60 text-purple-300' },
  fast_apply:              { label: '⚡ Fast Apply',    color: 'bg-emerald-900/60 text-emerald-300' },
  high_impact:             { label: '⭐ High Impact',   color: 'bg-blue-900/60 text-blue-300' },
  remote:                  { label: 'Remote',           color: 'bg-teal-900/60 text-teal-300' },
}

const FILTERABLE_TAGS = [
  'fast_apply', 'high_impact', 'faang_plus', 'remote',
  'no_sponsorship', 'us_citizenship_required', 'advanced_degree', 'closed',
]

// ---------------------------------------------------------------------------
// MultiSelectDropdown
// ---------------------------------------------------------------------------
function MultiSelectDropdown({ label, options, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const count = selected.size

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
          count > 0
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
            : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
        }`}
      >
        {label}{count > 0 ? ` (${count})` : ''}
        <ChevronDown size={11} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-neutral-800 bg-neutral-950 shadow-xl py-1">
          {options.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-neutral-800/60 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => onToggle(opt.value)}
                className="accent-amber-400 shrink-0"
              />
              <span className={selected.has(opt.value) ? 'text-neutral-100' : 'text-neutral-400'}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function Tag({ id }) {
  const meta = TAG_META[id]
  if (!meta) {
    const label = id.startsWith('term_') ? id.replace('term_', '').replace(/_/g, ' ') : id
    return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400">{label}</span>
  }
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
}

function SourceBadge({ sourceId, company }) {
  const meta = SOURCE_META[sourceId]
  const label = meta?.label ?? sourceId
  const href  = meta ? meta.fileUrl(company) : '#'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${company} in ${label}`}
      className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-amber-300 transition-colors whitespace-nowrap"
    >
      {label}
    </a>
  )
}

function ToggleButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? 'border-neutral-600 bg-neutral-700 text-neutral-100'
          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
      }`}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Jobs() {
  const [allJobs, setAllJobs]     = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [actionMsg, setActionMsg] = useState('')
  const [sources, setSources]     = useState([])

  // Filters
  const [typeFilter, setTypeFilter]           = useState('')
  const [searchQ, setSearchQ]                 = useState('')
  const [selectedTags, setSelectedTags]       = useState(new Set())
  const [selectedSources, setSelectedSources] = useState(new Set())

  // View options
  const [showSourceCols, setShowSourceCols] = useState(false)

  // Fetch all jobs once (client-side filtering for instant response)
  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { jobs: list, total: t } = await jobsApi.listJobs({ limit: 500 })
      setAllJobs(list)
      setTotal(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  useEffect(() => {
    jobsApi.getSources().then(({ sources: s }) => setSources(s)).catch(() => {})
  }, [])

  // Client-side filtering
  const jobs = useMemo(() => {
    return allJobs.filter(job => {
      if (typeFilter && job.type !== typeFilter) return false

      if (searchQ) {
        const q = searchQ.toLowerCase()
        const hay = `${job.company || ''} ${job.role || ''} ${job.location || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }

      if (selectedTags.size > 0) {
        const jobTags = new Set(job.tags || [])
        if (![...selectedTags].some(t => jobTags.has(t))) return false
      }

      if (selectedSources.size > 0) {
        const jobSources = new Set(job.source_ids || [])
        if (![...selectedSources].some(s => jobSources.has(s))) return false
      }

      return true
    })
  }, [allJobs, typeFilter, searchQ, selectedTags, selectedSources])

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const toggleSource = (sourceId) => {
    setSelectedSources(prev => {
      const next = new Set(prev)
      next.has(sourceId) ? next.delete(sourceId) : next.add(sourceId)
      return next
    })
  }

  const clearAll = () => {
    setTypeFilter('')
    setSearchQ('')
    setSelectedTags(new Set())
    setSelectedSources(new Set())
  }

  const hasFilters = typeFilter || searchQ || selectedTags.size > 0 || selectedSources.size > 0

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
      setAllJobs(prev => prev.map(j => j.id === jobId ? { ...j, in_queue: true } : j))
    } catch (e) {
      setActionMsg(`Queue error: ${e.message}`)
    }
  }

  const tagOptions = FILTERABLE_TAGS.map(t => ({ value: t, label: TAG_META[t]?.label ?? t }))
  const sourceOptions = sources.map(s => ({
    value: s.source_id,
    label: SOURCE_META[s.source_id]?.label ?? s.source_id,
  }))

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
          <p className="text-sm text-neutral-500 mt-0.5">
            {jobs.length !== total ? `${jobs.length} of ` : ''}{total} jobs
            {' · '}
            <Link to="/apps/jobs/queue" className="text-amber-400 hover:underline">My Queue →</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleButton label="Source columns" active={showSourceCols} onClick={() => setShowSourceCols(v => !v)} />
          <button onClick={handleRefresh} className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors">
            Refresh sources
          </button>
          <button onClick={handleEnrich} className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors">
            Enrich (50)
          </button>
        </div>
      </div>

      {actionMsg && <p className="mb-4 text-sm text-amber-300">{actionMsg}</p>}

      {/* Filters — single row */}
      <div className="mb-5 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search company, role, location…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 w-56"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
        >
          <option value="">All types</option>
          <option value="summer">Summer</option>
          <option value="offseason">Off-season</option>
          <option value="new_grad">New Grad</option>
        </select>
        <MultiSelectDropdown
          label="Tags"
          options={tagOptions}
          selected={selectedTags}
          onToggle={toggleTag}
        />
        {sourceOptions.length > 0 && (
          <MultiSelectDropdown
            label="Sources"
            options={sourceOptions}
            selected={selectedSources}
            onToggle={toggleSource}
          />
        )}
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-neutral-500 text-sm">Loading…</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <p className="text-lg mb-2">{allJobs.length === 0 ? 'No jobs yet.' : 'No jobs match these filters.'}</p>
          {allJobs.length === 0
            ? <p className="text-sm">Hit <strong>Refresh sources</strong> to pull in listings.</p>
            : <button onClick={clearAll} className="mt-2 text-sm text-amber-400 hover:underline">Clear filters</button>
          }
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
                {showSourceCols && <th className="px-4 py-2.5 font-medium">Sources</th>}
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className={`border-b border-neutral-900 hover:bg-neutral-900/40 transition-colors ${
                    job.tags?.includes('closed') ? 'opacity-40' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-neutral-100 whitespace-nowrap">
                    {job.company}
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
                  {showSourceCols && (
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(job.source_ids || []).map(sid => (
                          <SourceBadge key={sid} sourceId={sid} company={job.company || ''} />
                        ))}
                      </div>
                    </td>
                  )}
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
