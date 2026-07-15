import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, RefreshCw, FileText } from 'lucide-react'

export default function ResumeEdit() {
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const prevPdfUrl = useRef(null)

  useEffect(() => {
    fetch('/api/resume/default')
      .then(r => r.text())
      .then(text => { setYaml(text); generate(text) })
      .catch(e => setError(e.message))
  }, [])

  // Revoke old blob URL when a new one is set
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100vh-3.5rem)] flex-col lg:h-screen"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <h1 className="text-lg font-semibold text-neutral-100">Resume Builder</h1>
        <div className="flex gap-2">
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

      <div className="flex flex-1 overflow-hidden">
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

        <div className="relative flex-1 overflow-hidden bg-neutral-200">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-200/80 text-sm text-neutral-500">
              Converting via OnlyOffice…
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
