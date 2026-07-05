import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { GithubIcon, LinkedinIcon } from './BrandIcons'
import { profile } from '../content'

export default function ProfileWidget() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-3">
      <Link to="/about" className="group relative shrink-0">
        <img
          src={profile.avatar}
          alt={profile.name}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-neutral-800 transition group-hover:ring-amber-400/70"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-neutral-950/75 text-[9px] font-semibold uppercase tracking-wide text-amber-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          About me
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-100">{profile.name}</p>
        <p className="truncate text-xs text-neutral-500">{profile.tagline}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <a
          href={profile.resumeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-neutral-950 transition hover:bg-amber-300"
        >
          <FileText size={13} strokeWidth={2.5} />
          Resume
        </a>
        <a
          href={profile.links.github}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="rounded-full border border-neutral-800 p-2 text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-100"
        >
          <GithubIcon size={15} />
        </a>
        <a
          href={profile.links.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
          className="rounded-full border border-neutral-800 p-2 text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-100"
        >
          <LinkedinIcon size={15} />
        </a>
      </div>
    </div>
  )
}
