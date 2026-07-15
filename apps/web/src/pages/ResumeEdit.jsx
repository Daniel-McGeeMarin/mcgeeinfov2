import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, RefreshCw } from 'lucide-react'
import { renderAsync } from 'docx-preview'

export default function ResumeEdit() {
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [blob, setBlob] = useState(null)
  const previewRef = useRef(null)

  useEffect(() => {
    fetch('/api/resume/default')
      .then(r => r.text())
      .then(text => {
        setYaml(text)
        buildDoc(text)
      })
      .catch(e => setError(e.message))
  }, [])

  async function buildDoc(yamlText) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/resume/build', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: yamlText,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail ?? `Request failed (${res.status})`)
      }
      const docxBlob = await res.blob()
      setBlob(docxBlob)
      if (previewRef.current) {
        previewRef.current.innerHTML = ''
        await renderAsync(docxBlob, previewRef.current, null, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
        })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function download() {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.docx'
    a.click()
    URL.revokeObjectURL(url)
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
            onClick={() => buildDoc(yaml)}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-100 transition hover:bg-neutral-600 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Generate
          </button>
          <button
            onClick={download}
            disabled={!blob}
            className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:opacity-40"
          >
            <Download size={14} strokeWidth={2.5} />
            Download .docx
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

        <div className="flex-1 overflow-auto bg-neutral-200 p-6">
          {loading && !blob && (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Building…
            </div>
          )}
          <div ref={previewRef} />
        </div>
      </div>
    </motion.div>
  )
}
