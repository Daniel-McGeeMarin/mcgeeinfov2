import { content } from '../content'

export default function Contact() {
  return (
    <section id="contact" className="py-20 px-6 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <h2 className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Contact</h2>
        </div>
        <div className="md:col-span-2">
          <p className="text-neutral-600 leading-relaxed mb-6">
            Open to interesting conversations, opportunities, and collaborations.
          </p>
          <div className="space-y-2">
            {content.links.email && (
              <div>
                <a
                  href={`mailto:${content.links.email}`}
                  className="text-sm text-neutral-900 hover:text-neutral-400 transition-colors"
                >
                  {content.links.email}
                </a>
              </div>
            )}
            {content.links.github && (
              <div>
                <a
                  href={content.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-900 hover:text-neutral-400 transition-colors"
                >
                  github.com/Daniel-McGeeMarin
                </a>
              </div>
            )}
            {content.links.linkedin && (
              <div>
                <a
                  href={content.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-900 hover:text-neutral-400 transition-colors"
                >
                  LinkedIn
                </a>
              </div>
            )}
            {content.links.resume && (
              <div>
                <a
                  href={content.links.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-900 hover:text-neutral-400 transition-colors"
                >
                  Resume ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto mt-20 pt-8 border-t border-neutral-100">
        <p className="text-xs font-mono text-neutral-300">
          © {new Date().getFullYear()} {content.name}
        </p>
      </div>
    </section>
  )
}
