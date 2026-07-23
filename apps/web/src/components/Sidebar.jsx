import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { LayoutGrid, UserRound, FileText, Menu, X, Circle, Lock } from 'lucide-react'
import { profile, webApps } from '../content'
import { getAuthStatus } from '../api'

const pageLinks = [
  { to: '/', label: 'Portfolio', icon: LayoutGrid, end: true },
  { to: '/about', label: 'About Me', icon: UserRound },
  { to: '/resume', label: 'Resume', icon: FileText },
]

function NavItems({ onNavigate }) {
  return (
    <>
      <nav className="flex flex-col gap-1">
        {pageLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-800/80 text-amber-300'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {[
        { label: 'Tools', category: 'tools' },
        { label: 'Fun / Educational', category: 'educational' },
      ].map(({ label, category }) => (
        <div key={category} className="mt-8">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-600">
            {label}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {webApps.filter(a => a.category === category).map((app) => {
              const isLive = app.status === 'live'

              if (app.private) {
                return (
                  <li key={app.name} className="group/app relative">
                    <Link
                      to={app.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
                    >
                      <Lock size={10} className="shrink-0 text-neutral-600" />
                      <span className="truncate">{app.name}</span>
                    </Link>
                    <div className="pointer-events-none absolute left-full top-0 z-50 ml-3 w-60 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400 opacity-0 shadow-xl transition-opacity group-hover/app:opacity-100">
                      <p className="mb-1 font-medium text-neutral-300">{app.name}</p>
                      <p className="leading-relaxed">{app.description}</p>
                      <p className="mt-2 text-[10px] text-neutral-600 uppercase tracking-wide">Private — requires login</p>
                    </div>
                  </li>
                )
              }

              const content = (
                <>
                  <Circle
                    size={7}
                    className={isLive ? 'fill-emerald-400 text-emerald-400' : 'fill-neutral-700 text-neutral-700'}
                  />
                  <span className="truncate">{app.name}</span>
                  {!isLive && (
                    <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
                      Soon
                    </span>
                  )}
                </>
              )
              return (
                <li key={app.name}>
                  {isLive ? (
                    <Link
                      to={app.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-neutral-100"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-neutral-600">
                      {content}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}

function AuthWidget() {
  const [user, setUser] = useState(undefined)

  useEffect(() => { getAuthStatus().then(setUser) }, [])

  if (user === undefined) return (
    <div className="h-8" />
  )

  if (!user) return (
    <a
      href="https://auth.mcgeedan.com"
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
    >
      <Lock size={11} />
      Sign in
    </a>
  )

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-500">
      <Circle size={7} className="fill-emerald-500 text-emerald-500 shrink-0" />
      <span className="truncate">{user.display_name || user.username}</span>
    </div>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-neutral-900 bg-neutral-950/90 px-4 backdrop-blur lg:hidden">
        <Link to="/" className="font-mono text-sm font-medium text-neutral-100">
          {profile.name}
        </Link>
        <button
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-neutral-300 hover:bg-neutral-900"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute top-14 left-0 bottom-0 w-72 overflow-y-auto border-r border-neutral-900 bg-neutral-950 p-4">
            <NavItems onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed top-0 left-0 hidden h-screen w-64 flex-col border-r border-neutral-900 bg-neutral-950 p-5 lg:flex">
        <Link to="/" className="mb-8 px-3 font-mono text-sm font-medium text-neutral-100">
          {profile.name}
        </Link>
        <NavItems />
        <div className="mt-auto border-t border-neutral-900 pt-2">
          <AuthWidget />
        </div>
      </aside>
    </>
  )
}
