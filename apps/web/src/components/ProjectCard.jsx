import { motion } from 'framer-motion'
import { PlayCircle } from 'lucide-react'
import { GithubIcon } from './BrandIcons'

export default function ProjectCard({ project, index }) {
  const link = project.githubUrl
    ? { href: project.githubUrl, label: 'Code', icon: GithubIcon }
    : project.videoUrl
      ? { href: project.videoUrl, label: 'Watch demo', icon: PlayCircle }
      : null

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 transition hover:border-neutral-700"
    >
      <div className="aspect-video overflow-hidden bg-neutral-900">
        <img
          src={project.image}
          alt={project.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold text-neutral-100">{project.title}</h3>
        <p className="flex-1 text-sm leading-relaxed text-neutral-400">{project.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-500"
            >
              {tag}
            </span>
          ))}
        </div>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition hover:text-amber-300"
          >
            <link.icon size={14} />
            {link.label}
          </a>
        )}
      </div>
    </motion.article>
  )
}
