import { content } from '../content'

export default function About() {
  return (
    <section id="about" className="py-20 px-6 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <h2 className="text-xs font-mono text-neutral-400 uppercase tracking-widest">About</h2>
        </div>
        <div className="md:col-span-2">
          {content.about.split('\n\n').map((para, i) => (
            <p key={i} className="text-neutral-600 leading-relaxed mb-4 last:mb-0">
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
