import { motion } from 'framer-motion'
import ProfileWidget from '../components/ProfileWidget'
import ProjectCard from '../components/ProjectCard'
import WebAppCard from '../components/WebAppCard'
import { webApps, projects } from '../content'

export default function Portfolio() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-6xl px-6 py-10 lg:py-12"
    >
      <ProfileWidget />

      {[
        { label: 'Tools', category: 'tools' },
        { label: 'Fun / Educational', category: 'educational' },
      ].map(({ label, category }) => {
        const apps = webApps.filter(a => a.category === category)
        return (
          <section key={category} className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">{label}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {apps.map((app, i) => (
                <WebAppCard key={app.name} app={app} index={i} />
              ))}
            </div>
          </section>
        )
      })}

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Projects</h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.title} project={project} index={i} />
          ))}
        </div>
      </section>
    </motion.div>
  )
}
