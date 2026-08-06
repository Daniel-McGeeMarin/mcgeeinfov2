import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const DRIFT_LABELS = {
  never: "Hasn't happened",
  manual_diff: 'Manual diff re-read',
  catch_later: 'Catch later when it breaks',
  own_checks: 'Own checks/linting',
  accumulates: 'Just accumulates',
}

const SEVERITY_LABELS = {
  never: "Doesn't happen",
  small_constant: 'Small, constant cost',
  occasional: 'Occasional incident (hours–day)',
  rare_severe: 'Rare but severe (days lost)',
}

function Bar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-48 shrink-0 text-xs text-neutral-400 text-right leading-snug">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-neutral-800">
        <div
          className="h-2 rounded-full bg-neutral-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-xs text-neutral-500 tabular-nums">{count} <span className="text-neutral-700">({pct}%)</span></span>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <div className="text-2xl font-semibold text-neutral-100 tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
    </div>
  )
}

export default function SurveyResults() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/survey/results')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(setData)
      .catch(() => setError('Failed to load results'))
  }, [])

  if (error) return <div className="px-6 py-10 text-sm text-red-400">{error}</div>
  if (!data) return <div className="px-6 py-10 text-sm text-neutral-500">Loading…</div>

  const aiTotal = data.uses_ai

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-3xl px-6 py-10 lg:py-14 flex flex-col gap-10"
    >
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Survey Results</h1>
        <p className="mt-1 text-xs text-neutral-500">AI coding drift — aggregate responses</p>
      </div>

      {/* Top-line stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total responses" value={data.total} />
        <Stat label="Use AI agents" value={data.uses_ai} />
        <Stat label="Don't use AI" value={data.no_ai} />
      </div>

      {/* Q2: How they catch drift */}
      {aiTotal > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
            Q2 — How do you catch drift? <span className="normal-case tracking-normal font-normal">(multi-select, n={aiTotal})</span>
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(DRIFT_LABELS).map(([key, label]) => (
              <Bar
                key={key}
                label={label}
                count={data.drift_how_counts[key] ?? 0}
                total={aiTotal}
              />
            ))}
          </div>
        </section>
      )}

      {/* Q3: Severity */}
      {aiTotal > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
            Q3 — Drift severity <span className="normal-case tracking-normal font-normal">(n={aiTotal})</span>
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
              <Bar
                key={key}
                label={label}
                count={data.severity_counts[key] ?? 0}
                total={aiTotal}
              />
            ))}
          </div>
        </section>
      )}

      {/* Want results */}
      {data.want_results.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Want results ({data.want_results.length})
          </h2>
          <div className="flex flex-col gap-1.5">
            {data.want_results.map((r, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-neutral-400">{r.email}</span>
                {r.name && <span className="text-neutral-600">— {r.name}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Raw table */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
          Raw responses
        </h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">AI?</th>
                <th className="px-3 py-2 text-left font-medium">How</th>
                <th className="px-3 py-2 text-left font-medium">Severity</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {data.raw.map((r, i) => (
                <tr key={r.id} className={`border-b border-neutral-800/50 ${i % 2 === 0 ? '' : 'bg-neutral-900/30'}`}>
                  <td className="px-3 py-2 text-neutral-600">{r.id}</td>
                  <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{r.created_at.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-neutral-300">{r.full_name ?? <span className="text-neutral-700">—</span>}</td>
                  <td className="px-3 py-2">{r.uses_ai ? <span className="text-emerald-400">Yes</span> : <span className="text-neutral-600">No</span>}</td>
                  <td className="px-3 py-2 text-neutral-400 max-w-40">
                    {r.drift_how ? r.drift_how.map(v => DRIFT_LABELS[v] ?? v).join(', ') : <span className="text-neutral-700">—</span>}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">
                    {r.drift_severity ? (SEVERITY_LABELS[r.drift_severity] ?? r.drift_severity) : <span className="text-neutral-700">—</span>}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{r.email ?? <span className="text-neutral-700">—</span>}</td>
                </tr>
              ))}
              {data.raw.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-neutral-600">No responses yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  )
}
