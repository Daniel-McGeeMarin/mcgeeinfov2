import { content } from '../content'

export default function Hero() {
  return (
    <section className="pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-mono text-neutral-400 mb-4">{content.role}</p>
        <h1 className="text-5xl font-semibold tracking-tight text-neutral-900 mb-6 leading-tight">
          {content.name}
        </h1>
        <p className="text-xl text-neutral-500 max-w-xl leading-relaxed">
          {content.tagline}
        </p>
        <div className="flex items-center gap-4 mt-10">
          {content.links.github && (
            <a
              href={content.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-900 border border-neutral-200 rounded px-4 py-2 hover:border-neutral-400 transition-colors"
            >
              GitHub
            </a>
          )}
          {content.links.linkedin && (
            <a
              href={content.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-900 border border-neutral-200 rounded px-4 py-2 hover:border-neutral-400 transition-colors"
            >
              LinkedIn
            </a>
          )}
          {content.links.email && (
            <a
              href={`mailto:${content.links.email}`}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              {content.links.email}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
