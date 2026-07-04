import { content } from '../content'

export default function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-100">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="text-sm font-medium tracking-tight">{content.name}</span>
        <nav className="flex items-center gap-6">
          {content.nav.map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
