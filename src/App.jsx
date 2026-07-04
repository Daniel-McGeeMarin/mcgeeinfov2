import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Contact from './components/Contact'

export default function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects />
        <Contact />
      </main>
    </div>
  )
}
