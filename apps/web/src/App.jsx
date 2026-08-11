import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Portfolio from './pages/Portfolio'
import About from './pages/About'
import Resume from './pages/Resume'
import PokerTable from './pages/PokerTable'
import SessionTimer from './pages/SessionTimer'
import Jobs from './pages/Jobs'
import JobQueue from './pages/JobQueue'
import ModelFitApp from './apps/modelfit/ModelFitApp'
import ResumeEdit from './pages/ResumeEdit'
import Survey from './pages/Survey'
import SurveyResults from './pages/SurveyResults'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Portfolio />} />
        <Route path="/about" element={<About />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/apps/poker" element={<PokerTable />} />
        <Route path="/apps/session-timer" element={<SessionTimer />} />
        <Route path="/apps/jobs" element={<Jobs />} />
        <Route path="/apps/jobs/queue" element={<JobQueue />} />
        <Route path="/apps/resumedit" element={<ResumeEdit />} />
        <Route path="/survey" element={<Survey />} />
        <Route path="/survey/results" element={<SurveyResults />} />
      </Routes>
    </AnimatePresence>
  )
}

function Layout() {
  const location = useLocation()
  const isApp = location.pathname.startsWith('/apps/')
  const [collapsed, setCollapsed] = useState(isApp)

  useEffect(() => { setCollapsed(isApp) }, [isApp])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <main className={`pt-14 lg:pt-0 transition-[padding-left] duration-200 ${collapsed ? 'lg:pl-14' : 'lg:pl-64'}`}>
        <AnimatedRoutes />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Fullscreen — no sidebar or site chrome */}
        <Route path="/apps/modelfit" element={<ModelFitApp />} />

        {/* Everything else gets the sidebar layout */}
        <Route path="*" element={<Layout />} />
      </Routes>
    </BrowserRouter>
  )
}
