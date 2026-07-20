import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Check, ChevronRight, Download, FileText, FolderOpen, RefreshCw, Save, Trash2, X } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { tags as t } from '@lezer/highlight'

import { resumeApi } from '../api'

// ── Editor theme ──────────────────────────────────────────────────────────────

const yamlHighlight = HighlightStyle.define([
  { tag: t.comment,      color: '#525252' },
  { tag: t.propertyName, color: '#7dd3fc' },  // sky-300   — YAML keys
  { tag: t.string,       color: '#86efac' },  // green-300 — string values
  { tag: t.number,       color: '#93c5fd' },  // blue-300  — numbers
  { tag: t.bool,         color: '#f9a8d4' },  // pink-300  — booleans/null
  { tag: t.null,         color: '#f9a8d4' },
  { tag: t.keyword,      color: '#fbbf24' },  // amber     — --- markers
  { tag: t.punctuation,  color: '#71717a' },
  { tag: t.operator,     color: '#71717a' },
  { tag: t.meta,         color: '#fbbf24' },
])

// Font/size tweaks on top of oneDark base
const editorSizeTheme = EditorView.theme({
  '&':           { fontSize: '12px' },
  '.cm-content': { fontFamily: 'ui-monospace, monospace', padding: '16px 0' },
  '.cm-line':    { paddingLeft: '16px' },
  '.cm-gutters': { paddingRight: '8px', minWidth: '36px' },
})

const editorExtensions = [
  yaml(),
  EditorView.lineWrapping,
  syntaxHighlighting(yamlHighlight),
  editorSizeTheme,
]

// ── AI prompt builder ─────────────────────────────────────────────────────────

function buildAiPrompt(currentYaml) {
  return `You are a professional resume-writing assistant helping me edit a YAML-formatted resume. The YAML is fed into a custom builder that generates a formatted .docx and .pdf. Help me write strong content and return valid YAML.

## Schema Reference

\`\`\`yaml
header:
  name: "Full Name"                        # required
  phone: "555.555.5555"                    # required — always quote
  email: you@email.com                     # required
  linkedin: linkedin.com/in/handle        # required

education:
  - institution: "University Name"         # required
    program: "Program/Major Name"          # required — shown in italics
    graduation: "Month Year"               # required — e.g. "May 2028"
    degree: "B.S. Computer Science"        # required — shown after "Dual Degree:"
    gpa: "3.90"                            # required — always quote to preserve decimal
    coursework:                            # optional — labeled groups of courses
      - label: "CS"                        # short label, printed bold
        courses:                           # completed or in-progress
          - {number: "61A", name: "Intro to CS"}  # name is optional
          - {number: "170"}
        expected:                          # planned future courses (shown in italics)
          - {number: "189", name: "Machine Learning"}

experience:
  - role: "Job Title"                      # required
    company: "Company Name"               # required
    dates: "Jun–Aug 2025"                  # required — en-dash (–), not hyphen (-)
    location: "City, ST"                  # required
    bullets:                              # required — 2–5 achievement bullets
      - "Action verb + what you built + measurable result."

projects:
  - name: "Project Name"                   # required
    technologies: "Tech1, Tech2, Tech3"   # required — 3–5 items, comma-separated
    bullets:                              # required
      - "What you built, how you built it, and why it mattered."

skills:
  - category: "Programming"              # required — label printed in bold
    content: "Python, Java, C++"         # required — free text or comma-separated list
\`\`\`

## Bullet Writing Rules

Strong bullets = strong verb + what you built + impact/scale.

✅ "Built a semantic search engine over 500K documents, reducing query latency by 60%."
✅ "Engineered a self-healing replication protocol using BFS propagation across peer clusters."
❌ "Worked on data pipelines" (weak verb, no scale)
❌ "Helped with the ML model" (passive, vague)

Opening verbs (past tense): Built, Designed, Engineered, Developed, Trained, Optimized,
Led, Implemented, Deployed, Reduced, Increased, Automated, Architected, Integrated,
Migrated, Benchmarked, Analyzed, Researched, Developed.

Rules:
- One sentence per bullet, 1–2 lines. No semicolons splitting two ideas.
- Quantify wherever possible: latency %, accuracy %, scale (records/sec, files, users), time saved.
- Do NOT use the same opening verb twice in the same job or project.
- No filler: avoid "Responsible for", "Worked on", "Assisted with", "Helped".

## YAML Formatting Rules

1. Quote any value containing a colon (:), ampersand (&), or that starts with a number.
2. GPA and phone must always be quoted (gpa: "3.90", phone: "859.445.1659").
3. Dates use en-dash (–) not hyphen (-): "Jun–Aug 2025" not "Jun-Aug 2025".
4. Keep key order: header → education → experience → projects → skills.
5. Do not add keys not listed in the schema above.
6. Preserve all existing content exactly unless asked to change it.
7. OUTPUT: Return ONLY valid YAML — no markdown fences, no explanation before or after.

## My Current Resume YAML

${currentYaml.trim()}

---
What would you like to change? (e.g. "Add a new internship at X", "Strengthen the bullets for Y", "Add a project about Z", "Make all bullets more impact-driven")`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// ── Saved-resumes drawer ──────────────────────────────────────────────────────

function ResumeDrawer({ open, onClose, onLoad, currentId }) {
  const [resumes, setResumes] = useState(null)
  const [err, setErr] = useState(null)
  const [authed, setAuthed] = useState(true)

  const load = useCallback(async () => {
    try {
      const list = await resumeApi.list()
      setResumes(list)
      setAuthed(true)
    } catch (e) {
      if (e.status === 401) { setAuthed(false); return }
      setErr(e.message)
    }
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this resume?')) return
    await resumeApi.delete(id).catch(() => {})
    setResumes(r => r.filter(x => x.id !== id))
  }

  async function handleLoad(id) {
    try {
      const row = await resumeApi.get(id)
      onLoad(row)
      onClose()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="absolute left-0 top-0 z-30 flex h-full w-80 flex-col border-r border-neutral-700 bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <span className="text-sm font-semibold text-neutral-100">Saved Resumes</span>
              <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!authed ? (
                <p className="px-4 py-6 text-xs text-neutral-500">Log in to access saved resumes.</p>
              ) : resumes === null ? (
                <p className="px-4 py-6 text-xs text-neutral-500">Loading…</p>
              ) : err ? (
                <p className="px-4 py-6 text-xs text-red-400">{err}</p>
              ) : resumes.length === 0 ? (
                <p className="px-4 py-6 text-xs text-neutral-500">No saved resumes yet.</p>
              ) : (
                <ul>
                  {resumes.map(r => (
                    <li
                      key={r.id}
                      onClick={() => handleLoad(r.id)}
                      className={`group flex cursor-pointer items-center gap-3 border-b border-neutral-800 px-4 py-3 hover:bg-neutral-800 ${r.id === currentId ? 'bg-neutral-800/60' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm text-neutral-100">
                          {r.id === currentId && <Check size={12} className="shrink-0 text-amber-400" />}
                          <span className="truncate">{r.name}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-neutral-500">{relTime(r.updated_at)}</div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        className="shrink-0 text-neutral-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} className="shrink-0 text-neutral-600" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Inline name input ─────────────────────────────────────────────────────────

function NameInput({ onConfirm, onCancel }) {
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])

  function handleKey(e) {
    if (e.key === 'Enter') onConfirm(e.target.value.trim())
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        type="text"
        placeholder="Resume name…"
        onKeyDown={handleKey}
        onBlur={() => onCancel()}
        className="w-44 rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-amber-400"
      />
      <span className="text-xs text-neutral-500">↵ to save</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResumeEdit() {
  const [yamlText, setYamlText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const prevPdfUrl = useRef(null)

  // saved-resume state
  const [currentSave, setCurrentSave] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [namingNew, setNamingNew] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [authed, setAuthed] = useState(true)

  // prompt copy state
  const [promptCopied, setPromptCopied] = useState(false)

  // resizable split
  const [splitPct, setSplitPct] = useState(40)
  const containerRef = useRef(null)

  useEffect(() => {
    fetch('/api/resume/default')
      .then(r => { if (!r.ok) throw new Error(`API unavailable (${r.status})`); return r.text() })
      .then(text => { setYamlText(text); generate(text) })
      .catch(e => setError(e.message))

    resumeApi.list().catch(e => { if (e.status === 401) setAuthed(false) })
  }, [])

  useEffect(() => {
    if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current)
    prevPdfUrl.current = pdfUrl
  }, [pdfUrl])

  // ── drag-to-resize ──────────────────────────────────────────────────────────

  function startDrag(e) {
    e.preventDefault()
    function move(e) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPct(Math.max(20, Math.min(75, pct)))
    }
    function up() {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  // ── generate / download ─────────────────────────────────────────────────────

  async function generate(text) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/resume/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail ?? `Request failed (${res.status})`)
      }
      const blob = await res.blob()
      setPdfUrl(URL.createObjectURL(blob))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function downloadDocx() {
    try {
      const res = await fetch('/api/resume/build', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: yamlText,
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'resume.docx'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    }
  }

  function downloadPdf() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl; a.download = 'resume.pdf'; a.click()
  }

  // ── save / load ─────────────────────────────────────────────────────────────

  async function saveExisting() {
    if (!currentSave) return
    setSaveStatus('saving')
    try {
      await resumeApi.update(currentSave.id, { yaml: yamlText })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 1500)
    } catch (e) {
      setSaveStatus('error')
      setError(e.message)
      setTimeout(() => setSaveStatus(null), 2000)
    }
  }

  async function saveNew(name) {
    if (!name) { setNamingNew(false); return }
    setNamingNew(false)
    setSaveStatus('saving')
    try {
      const row = await resumeApi.create(name, yamlText)
      setCurrentSave({ id: row.id, name: row.name })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 1500)
    } catch (e) {
      setSaveStatus('error')
      setError(e.message)
      setTimeout(() => setSaveStatus(null), 2000)
    }
  }

  function handleLoad(row) {
    setYamlText(row.yaml)
    setCurrentSave({ id: row.id, name: row.name })
    generate(row.yaml)
  }

  async function handleNew() {
    const text = await fetch('/api/resume/default').then(r => r.text()).catch(() => '')
    setYamlText(text)
    setCurrentSave(null)
    generate(text)
  }

  // ── prompt copy ─────────────────────────────────────────────────────────────

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(yamlText))
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 1800)
    } catch {
      setError('Clipboard access denied')
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved'   ? 'Saved!'
    : saveStatus === 'error'   ? 'Error'
    : 'Save'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100vh-3.5rem)] flex-col lg:h-screen"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-neutral-100">Resume Builder</h1>

          {authed && (
            <>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-700"
              >
                <FolderOpen size={12} />
                My Resumes
              </button>

              {namingNew ? (
                <NameInput onConfirm={saveNew} onCancel={() => setNamingNew(false)} />
              ) : currentSave ? (
                <span className="max-w-[180px] truncate text-xs text-neutral-500">
                  {currentSave.name}
                </span>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI prompt copy */}
          <button
            onClick={copyPrompt}
            title="Copy AI prompt to clipboard"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              promptCopied
                ? 'bg-green-800 text-green-200'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
            }`}
          >
            <Bot size={13} />
            {promptCopied ? 'Copied!' : 'AI Prompt'}
          </button>

          {authed && (
            <button
              onClick={currentSave ? saveExisting : () => setNamingNew(true)}
              disabled={saveStatus === 'saving' || namingNew}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                saveStatus === 'saved' ? 'bg-green-700 text-white'
                : saveStatus === 'error' ? 'bg-red-700 text-white'
                : 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600'
              }`}
            >
              <Save size={14} />
              {saveLabel}
            </button>
          )}

          <button
            onClick={handleNew}
            className="flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-neutral-700 hover:text-neutral-200"
          >
            New
          </button>

          <button
            onClick={() => generate(yamlText)}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-100 transition hover:bg-neutral-600 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Generating…' : 'Generate'}
          </button>

          <button
            onClick={downloadPdf}
            disabled={!pdfUrl}
            className="flex items-center gap-2 rounded-full bg-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-100 transition hover:bg-neutral-600 disabled:opacity-40"
          >
            <Download size={14} />
            .pdf
          </button>

          <button
            onClick={downloadDocx}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:opacity-40"
          >
            <FileText size={14} strokeWidth={2.5} />
            .docx
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div ref={containerRef} className="relative flex flex-1 overflow-hidden select-none">
        <ResumeDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onLoad={handleLoad}
          currentId={currentSave?.id}
        />

        {/* YAML editor panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${splitPct}%` }}
        >
          <div className="flex-1 overflow-auto">
            <CodeMirror
              value={yamlText}
              onChange={setYamlText}
              theme={oneDark}
              extensions={editorExtensions}
              height="100%"
              style={{ minHeight: '100%' }}
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBrackets: false,
              }}
            />
          </div>
          {error && (
            <div className="shrink-0 border-t border-red-900 bg-red-950/60 px-4 py-2 font-mono text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={startDrag}
          className="group relative z-10 w-1 shrink-0 cursor-col-resize bg-neutral-800 transition-colors hover:bg-amber-400"
        >
          {/* Wider invisible hit area */}
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </div>

        {/* PDF preview panel */}
        <div className="relative flex-1 overflow-hidden bg-neutral-200">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-200/80 text-sm text-neutral-500">
              Converting…
            </div>
          )}
          {pdfUrl ? (
            <iframe src={pdfUrl} title="Resume preview" className="h-full w-full border-0" />
          ) : !loading && (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Click Generate to preview
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
