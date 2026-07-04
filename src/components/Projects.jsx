import { content } from '../content'

export default function Projects() {
  return (
    <section id="projects" className="py-20 px-6 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <h2 className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Projects</h2>
        </div>
        <div className="md:col-span-2 space-y-10">
          {content.projects.map((project) => (
            <div key={project.name}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-medium text-neutral-900">{project.name}</h3>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 hover:text-neutral-900 transition-colors shrink-0 mt-0.5"
                  >
                    ↗
                  </a>
                )}
              </div>
              <p className="text-sm text-neutral-500 leading-relaxed mb-3">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {project.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs font-mono text-neutral-400 bg-neutral-50 border border-neutral-100 rounded px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
