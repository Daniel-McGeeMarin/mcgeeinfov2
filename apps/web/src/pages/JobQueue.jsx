import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { jobsApi } from '../api'

const STATUSES = ['saved', 'applied', 'interviewing', 'rejected', 'offer']

const STATUS_STYLE = {
  saved:        'bg-neutral-800 text-neutral-300',
  applied:      'bg-blue-900/60 text-blue-300',
  interviewing: 'bg-amber-900/60 text-amber-300',
  rejected:     'bg-red-900/40 text-red-400',
  offer:        'bg-emerald-900/60 text-emerald-300',
}

function QueueRow({ entry, onUpdate, onRemove }) {
  const [notes, setNotes]   = useState(entry.notes || '')
  const [saving, setSaving] = useState(false)

  const update = async (patch) => {
    setSaving(true)
    try {
      await jobsApi.updateQueue(entry.job_id, patch)
      onUpdate(entry.job_id, patch)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = () => {
    if (notes !== entry.notes) update({ notes })
  }

  return (
    <tr className="border-b border-neutral-900 hover:bg-neutral-900/30 transition-colors">
      <td className="px-4 py-3 font-medium text-neutral-100 whitespace-nowrap">{entry.company}</td>
      <td className="px-4 py-3 text-neutral-300 max-w-[220px] truncate">{entry.role}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        <select
          value={entry.priority}
          onChange={e => update({ priority: Number(e.target.value) })}
          disabled={saving}
          className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 border-none focus:outline-none"
        >
          {[1,2,3,4,5].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <select
          value={entry.status}
          onChange={e => update({ status: e.target.value })}
          disabled={saving}
          className={`rounded px-2 py-1 text-xs border-none focus:outline-none ${STATUS_STYLE[entry.status] || 'bg-neutral-800 text-neutral-300'}`}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          onKeyDown={e => e.key === 'Enter' && saveNotes()}
          placeholder="Notes…"
          className="w-full rounded bg-neutral-900 px-2 py-1 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-3">
          {entry.apply_url && (
            <a href={entry.apply_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:text-amber-300">
              Apply →
            </a>
          )}
          <button
            onClick={() => onRemove(entry.job_id)}
            className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function JobQueue() {
  const [queue, setQueue]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('all')

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const { queue: q } = await jobsApi.getQueue()
      setQueue(q)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const handleUpdate = (jobId, patch) => {
    setQueue(prev => prev.map(e => e.job_id === jobId ? { ...e, ...patch } : e))
  }

  const handleRemove = async (jobId) => {
    try {
      await jobsApi.removeFromQueue(jobId)
      setQueue(prev => prev.filter(e => e.job_id !== jobId))
    } catch (e) {
      console.error(e)
    }
  }

  const visible = filter === 'all' ? queue : queue.filter(e => e.status === filter)

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = queue.filter(e => e.status === s).length
    return acc
  }, {})

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen p-6 lg:p-10"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">My Queue</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {queue.length} jobs · <Link to="/apps/jobs" className="text-amber-400 hover:underline">← Browse all</Link>
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'all' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          All ({queue.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === s ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm">Loading…</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <p className="text-lg mb-2">{filter === 'all' ? 'Queue is empty.' : `No ${filter} entries.`}</p>
          {filter === 'all' && <p className="text-sm">Add jobs from the <Link to="/apps/jobs" className="text-amber-400 hover:underline">job browser</Link>.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Priority</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Notes</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(entry => (
                <QueueRow
                  key={entry.job_id}
                  entry={entry}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
