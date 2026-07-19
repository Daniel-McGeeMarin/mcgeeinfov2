import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, Download, FileText, FolderOpen, RefreshCw, Save, Trash2, X } from 'lucide-react'

import { resumeApi } from '../api'

function relTime(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// ---------------------------------------------------------------------------
// Saved-resumes drawer
// ---------------------------------------------------------------------------
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
          {/* backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/40"
            onClick={onClose}
          />
          {/* drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
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
                <p className="px-4 py-6 text-xs text-neutral-500">
                  Log in to access saved resumes.
                </p>
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

// ---------------------------------------------------------------------------
// Inline name input that appears in the header bar
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ResumeEdit() {
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const prevPdfUrl = useRef(null)

  // saved-resume state
  const [currentSave, setCurrentSave] = useState(null) // {id, name}
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [namingNew, setNamingNew] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [authed, setAuthed] = useState(true)

  useEffect(() => {
    fetch('/api/resume/default')
      .then(r => { if (!r.ok) throw new Error(`API unavailable (${r.status})`); return r.text() })
      .then(text => { setYaml(text); generate(text) })
      .catch(e => setError(e.message))

    // probe auth silently
    resumeApi.list().catch(e => { if (e.status === 401) setAuthed(false) })
  }, [])

  useEffect(() => {
    if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current)
    prevPdfUrl.current = pdfUrl
  }, [pdfUrl])

  async function generate(yamlText) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/resume/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: yamlText,
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
        body: yaml,
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

  // Called when user clicks Save with an existing save loaded
  async function saveExisting() {
    if (!currentSave) return
    setSaveStatus('saving')
    try {
      await resumeApi.update(currentSave.id, { yaml })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 1500)
    } catch (e) {
      setSaveStatus('error')
      setError(e.message)
      setTimeout(() => setSaveStatus(null), 2000)
    }
  }

  // Called when user confirms name for a new save
  async function saveNew(name) {
    if (!name) { setNamingNew(false); return }
    setNamingNew(false)
    setSaveStatus('saving')
    try {
      const row = await resumeApi.create(name, yaml)
      setCurrentSave({ id: row.id, name: row.name })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 1500)
    } catch (e) {
      setSaveStatus('error')
      setError(e.message)
      setTimeout(() => setSaveStatus(null), 2000)
    }
  }

  function handleSaveClick() {
    if (currentSave) saveExisting()
    else setNamingNew(true)
  }

  // Load a resume from the drawer
  function handleLoad(row) {
    setYaml(row.yaml)
    setCurrentSave({ id: row.id, name: row.name })
    generate(row.yaml)
  }

  // New — reset to default
  async function handleNew() {
    const text = await fetch('/api/resume/default').then(r => r.text()).catch(() => '')
    setYaml(text)
    setCurrentSave(null)
    generate(text)
  }

  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved!'
    : saveStatus === 'error' ? 'Error'
    : 'Save'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100vh-3.5rem)] flex-col lg:h-screen"
    >
      {/* Header */}
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
                <NameInput
                  onConfirm={saveNew}
                  onCancel={() => setNamingNew(false)}
                />
              ) : currentSave ? (
                <span className="max-w-[180px] truncate text-xs text-neutral-500">
                  {currentSave.name}
                </span>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {authed && (
            <button
              onClick={handleSaveClick}
              disabled={saveStatus === 'saving' || namingNew}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                saveStatus === 'saved' ? 'bg-green-700 text-white' :
                saveStatus === 'error' ? 'bg-red-700 text-white' :
                'bg-neutral-700 text-neutral-100 hover:bg-neutral-600'
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
            onClick={() => generate(yaml)}
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

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden">
        <ResumeDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onLoad={handleLoad}
          currentId={currentSave?.id}
        />

        {/* YAML editor */}
        <div className="flex w-2/5 flex-col border-r border-neutral-800">
          <textarea
            value={yaml}
            onChange={e => setYaml(e.target.value)}
            className="flex-1 resize-none bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-300 outline-none"
            spellCheck={false}
          />
          {error && (
            <div className="border-t border-red-900 bg-red-950/60 px-4 py-2 font-mono text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* PDF preview */}
        <div className="relative flex-1 overflow-hidden bg-neutral-200">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-200/80 text-sm text-neutral-500">
              Converting…
            </div>
          )}
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Resume preview"
              className="h-full w-full border-0"
            />
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
